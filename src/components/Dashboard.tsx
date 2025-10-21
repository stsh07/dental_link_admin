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
  confirmed: number;
  declined: number;
  cancelled: number;
  completed: number;
};

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>('');

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setErr('');
        const res = await fetch('http://localhost:4000/api/admin/stats', { cache: 'no-store' });
        const json: Stats = await res.json();
        if (!res.ok) throw new Error((json as any).error || 'Failed to load stats');
        setStats(json);
      } catch (e: any) {
        setErr(e?.message || 'Failed to load stats');
        setStats(null);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const totalPatients = (stats?.confirmed || 0) + (stats?.completed || 0);
  const completed = stats?.completed || 0;
  const pending = stats?.pending || 0;
  const declined = stats?.declined || 0;

  const cards = [
    { label: 'Total Patients', value: totalPatients, iconSrc: totalPatientIcon },
    { label: 'Completed', value: completed, iconSrc: completedIcon },
    { label: 'Pending', value: pending, iconSrc: pendingIcon },
    { label: 'Declined', value: declined, iconSrc: declinedIcon },
  ];

  const services = [
    { name: 'Cleaning', percentage: 55, color: 'bg-blue-500' },
    { name: 'Tooth Extraction', percentage: 25, color: 'bg-blue-500' },
    { name: 'Tooth Filling', percentage: 20, color: 'bg-blue-500' }
  ];

  const doctors = [
    { name: 'Dr. Juan Dela Cruz', time: '08:00 - 17:00', patients: 3, status: 'At Work' },
    { name: 'Dr. Juan Dela Cruz', time: '08:00 - 17:00', patients: 2, status: 'Lunch' },
    { name: 'Dr. Juan Dela Cruz', time: '08:00 - 17:00', patients: 4, status: 'At Work' },
    { name: 'Dr. Juan Dela Cruz', time: '08:00 - 17:00', patients: 1, status: 'At Work' }
  ];

  const appointments = [
    { patient: 'Juan Dela Cruz', time: '10:00AM', date: '10.24.24', treatment: 'Cleaning' },
    { patient: 'Juan Dela Cruz', time: '8:00 AM',  date: '10.24.24', treatment: 'Consultation' },
    { patient: 'Juan Dela Cruz', time: '2:00 PM',  date: '10.24.24', treatment: 'Tooth Filling' }
  ];

  const statusClass = (status: string) =>
    status === 'At Work'
      ? 'text-green-600'
      : status === 'Lunch'
      ? 'text-orange-500'
      : 'text-gray-500';

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
          {loading && <p className="text-sm text-gray-500 mb-3">Loading stats…</p>}
          {!!err && <p className="text-sm text-red-600 mb-3">Error: {err}</p>}

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
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Doctors at work</h3>

              <div className="divide-y divide-gray-200">
                {doctors.map((doctor, idx) => (
                  <div key={idx} className="grid grid-cols-3 items-center py-3">
                    <div>
                      <p className="font-medium text-gray-900 leading-6">{doctor.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{doctor.time}</p>
                    </div>

                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-900">{doctor.patients} patients</p>
                    </div>

                    {/* Status */}
                    <div className="text-left">
                      <p className={`text-sm font-medium ${statusClass(doctor.status)}`}>
                        {doctor.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Today's Appointments */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-10">Todays Appointments</h3>

              {/* Header row */}
              <div className="grid grid-cols-3 text-sm font-medium text-gray-600 mb-3 px-1">
                <span>Patient</span>
                <span>Date &amp; Time</span>
                <span className="text-left">Treatment type</span>
              </div>

              <div className="space-y-3">
                {appointments.map((a, i) => (
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
