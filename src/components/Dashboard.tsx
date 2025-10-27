import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import Sidebar from './Sidebar';

// SVGs
import totalPatientIcon from '../assets/total_patient.svg';
import completedIcon from '../assets/completed.svg';
import pendingIcon from '../assets/pending.svg';
import declinedIcon from '../assets/declined.svg';

type Stats = {
  total: number;
  pending: number;
  confirmed: number; // Approved in UI
  declined: number;
  completed: number;
};

type DoctorRow = {
  id: number;
  full_name: string;
  position?: string | null;
  work_time?: string | null;
  patients_today?: number | null; // ignored; we compute counts from appointments
  status?: 'At Work' | 'Lunch' | 'Off' | 'Absent' | 'At Leave' | string | null;
  created_at?: string;
};

type ApiAppointment = {
  id: number;
  patientName: string;
  doctor: string;
  date: string;       // YYYY-MM-DD
  timeStart: string;  // HH:MM
  service: string;
  status: 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'COMPLETED';
};

const Dashboard: React.FC = () => {
  /* ===================== STATS ===================== */
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsErr, setStatsErr] = useState<string>('');

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      setStatsErr('');
      const res = await fetch('http://localhost:4000/api/admin/stats', { cache: 'no-store' });
      const json: Stats | any = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load stats');
      setStats(json as Stats);
    } catch (e: any) {
      setStatsErr(e?.message || 'Failed to load stats');
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    const refresh = () => fetchStats();
    window.addEventListener('appointments-updated', refresh);
    return () => window.removeEventListener('appointments-updated', refresh);
  }, []);

  const approved  = stats?.confirmed || 0;
  const completed = stats?.completed || 0;
  const pending   = stats?.pending || 0;
  const declined  = stats?.declined || 0;

  const cards = [
    { label: 'Approved',  value: approved,  iconSrc: totalPatientIcon },
    { label: 'Completed', value: completed, iconSrc: completedIcon },
    { label: 'Pending',   value: pending,   iconSrc: pendingIcon },
    { label: 'Declined',  value: declined,  iconSrc: declinedIcon },
  ];

  const services = [
    { name: 'Cleaning', percentage: 55, color: 'bg-blue-500' },
    { name: 'Tooth Extraction', percentage: 25, color: 'bg-blue-500' },
    { name: 'Tooth Filling', percentage: 20, color: 'bg-blue-500' }
  ];

  /* ===================== DOCTORS + ACTIVE COUNTS ===================== */
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState<boolean>(true);
  const [doctorsErr, setDoctorsErr] = useState<string>('');

  // Map of normalized doctor name -> active appt count
  const [activeCounts, setActiveCounts] = useState<Record<string, number>>({});
  const [countsLoading, setCountsLoading] = useState<boolean>(true);

  const normalize = (s: string) => (s || '').trim().toLowerCase();

  const fetchDoctors = async () => {
    try {
      setDoctorsLoading(true);
      setDoctorsErr('');
      const res = await fetch('http://localhost:4000/api/doctors', { cache: 'no-store' });
      const json: any = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error || 'Failed to load doctors');
      setDoctors(json.doctors as DoctorRow[]);
    } catch (e: any) {
      setDoctorsErr(e?.message || 'Failed to load doctors');
      setDoctors([]);
    } finally {
      setDoctorsLoading(false);
    }
  };

  // Get active appointments (PENDING + CONFIRMED) and count by doctor name
  const fetchActiveCounts = async () => {
    try {
      setCountsLoading(true);
      const u = new URL('http://localhost:4000/api/admin/appointments');
      u.searchParams.set('page', '1');
      u.searchParams.set('pageSize', '500');
      const res = await fetch(u.toString(), { cache: 'no-store' });
      const json: any = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load appointments');
      const items: ApiAppointment[] = json.items || [];
      const active = items.filter(a => a.status === 'PENDING' || a.status === 'CONFIRMED');

      const map: Record<string, number> = {};
      for (const a of active) {
        const key = normalize(a.doctor);
        if (!key) continue;
        map[key] = (map[key] ?? 0) + 1;
      }
      setActiveCounts(map);
    } catch (e) {
      // keep last counts on error
    } finally {
      setCountsLoading(false);
    }
  };

  const loadDoctorsAndCounts = async () => {
    await Promise.all([fetchDoctors(), fetchActiveCounts()]);
  };

  useEffect(() => {
    loadDoctorsAndCounts();
  }, []);

  // Refresh when appointments or doctors change elsewhere (profile/status or approvals)
  useEffect(() => {
    const refresh = () => loadDoctorsAndCounts();
    window.addEventListener('appointments-updated', refresh);
    window.addEventListener('doctors-updated', refresh);
    window.addEventListener('focus', refresh); // refresh when coming back to the tab
    return () => {
      window.removeEventListener('appointments-updated', refresh);
      window.removeEventListener('doctors-updated', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const statusClass = (status?: string | null) =>
    status === 'At Work'
      ? 'text-green-600'
      : status === 'Lunch'
      ? 'text-orange-500'
      : status === 'At Leave'
      ? 'text-blue-600'
      : status === 'Absent'
      ? 'text-gray-600'
      : 'text-gray-500';

  // Only show "At Work"
  const doctorsAtWork = doctors.filter((d) => (d.status || '') === 'At Work');

  const appointmentsSamples = [
    { patient: 'Juan Dela Cruz', time: '10:00AM', date: '10.24.24', treatment: 'Cleaning' },
    { patient: 'Juan Dela Cruz', time: '8:00 AM',  date: '10.24.24', treatment: 'Consultation' },
    { patient: 'Juan Dela Cruz', time: '2:00 PM',  date: '10.24.24', treatment: 'Tooth Filling' }
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <div className="h-[72px] bg-white shadow-sm px-8 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-black text-[28px] font-semibold">Dashboard Overview</h1>
          <Bell className="w-6 h-6 text-gray-600" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Status / error */}
          {statsLoading && <p className="text-sm text-gray-500 mb-3">Loading stats…</p>}
          {!!statsErr && <p className="text-sm text-red-600 mb-3">Error: {statsErr}</p>}

          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {cards.map((c) => (
              <div key={c.label} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center">
                  <img src={c.iconSrc} alt={c.label} className="w-12 h-12 mr-4 object-contain" />
                  <div>
                    <p className="text-sm text-gray-600">{c.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{c.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Top Services */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Services</h3>
            <div className="space-y-4">
              {services.map((service, index) => (
                <div key={index}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">{service.name}</span>
                    <span className="text-sm text-gray-600">{service.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 h-2 rounded">
                    <div
                      className={`h-2 rounded ${service.color}`}
                      style={{ width: `${service.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Doctors at work */}
            <div className="bg-white px-6 pt-6 pb-2 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Doctors at work</h3>
                {(doctorsLoading || countsLoading) && (
                  <span className="text-xs text-gray-500">Refreshing…</span>
                )}
              </div>

              {!!doctorsErr && (
                <p className="text-sm text-red-600 mb-3">Error: {doctorsErr}</p>
              )}

              {(!doctorsLoading && !countsLoading && doctorsAtWork.length === 0) ? (
                <p className="text-sm text-gray-500 mb-3">No doctors are currently at work.</p>
              ) : (
                <div className="divide-y divide-gray-200">
                  {doctorsAtWork.map((d) => {
                    const count = activeCounts[normalize(d.full_name)] ?? 0;
                    return (
                      <div key={d.id} className="grid grid-cols-3 items-center py-3">
                        <div>
                          <p className="font-medium text-gray-900 leading-6">{d.full_name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{d.work_time || '08:00 – 17:00'}</p>
                        </div>

                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-900">
                            {count} patients
                          </p>
                        </div>

                        {/* Status */}
                        <div className="text-left">
                          <p className={`text-sm font-medium ${statusClass(d.status)}`}>
                            {d.status || 'At Work'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Today's Appointments (sample/static) */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-10">Todays Appointments</h3>

              {/* Header row */}
              <div className="grid grid-cols-3 text-sm font-medium text-gray-600 mb-3 px-1">
                <span>Patient</span>
                <span>Date &amp; Time</span>
                <span className="text-left">Treatment type</span>
              </div>

              <div className="space-y-3">
                {appointmentsSamples.map((a, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-3 items-center gap-4 rounded-xl border border-gray-200 bg-white shadow-sm px-4 py-3"
                  >
                    <div className="truncate">
                      <p className="text-sm font-medium text-gray-900">{a.patient}</p>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-gray-900">{a.time}</p>
                      <p className="text-xs text-gray-400">{a.date}</p>
                    </div>

                    <div className="text-left">
                      <p className="text-sm font-semibold text-gray-900">{a.treatment}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* End Bottom Section */}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
