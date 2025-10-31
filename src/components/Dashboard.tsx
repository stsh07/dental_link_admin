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
  patients_today?: number | null;
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

type ApiResponse = { page: number; pageSize: number; total: number; items: any[] };

/* ===================== Helpers ===================== */
const normalize = (s: string) => (s || '').trim().toLowerCase();

// Manila "today" as YYYY-MM-DD (no external libs)
const todayYMDManila = (): string => {
  const d = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })
  );
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// parse "HH:MM"
const parseHHMM = (val?: string | null): { h: number; m: number } | null => {
  if (!val || typeof val !== "string") return null;
  const m = val.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]); const mm = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(mm)) return null;
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  return { h, m: mm };
};
const to12hSafe = (hhmm?: string | null): string => {
  const t = parseHHMM(hhmm);
  if (!t) return "—";
  const am = t.h < 12;
  const h = t.h % 12 || 12;
  return `${h}:${String(t.m).padStart(2, "0")} ${am ? "AM" : "PM"}`;
};
const addMinutesSafe = (hhmm: string | null | undefined, mins: number): string | null => {
  const t = parseHHMM(hhmm);
  if (!t) return null;
  const total = t.h * 60 + t.m + mins;
  const hh = Math.floor(((total % (24 * 60)) + (24 * 60)) % (24 * 60) / 60);
  const mm = ((total % (24 * 60)) + (24 * 60)) % (24 * 60) % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};
const fmtDateCompact = (ymd: string): string => {
  // 2025-10-24 -> 10.24.25
  const [y, m, d] = ymd.split('-');
  return `${m}.${d}.${String(y).slice(-2)}`;
};

// Robust normalizer (same as ActiveAppointments)
const normalizeItem = (raw: any): ApiAppointment => {
  const id = Number(raw.id ?? 0);
  const patientName = String(raw.patientName ?? raw.full_name ?? raw.name ?? "").trim();
  const doctor = String(raw.doctor ?? raw.doctorName ?? raw.dentist ?? "").trim();
  const date = String(raw.date ?? raw.preferredDate ?? "").slice(0, 10);
  const timeStart = String(raw.timeStart ?? raw.preferredTime ?? "").slice(0, 5);
  const service = String(raw.service ?? raw.serviceName ?? raw.procedureName ?? raw.procedure ?? "").trim();
  const status = (String(raw.status ?? "PENDING").toUpperCase() as ApiAppointment["status"]);
  return { id, patientName, doctor, date, timeStart, service, status };
};

/* ===================== Component ===================== */
const Dashboard: React.FC = () => {
  /* ---------- STATS ---------- */
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsErr, setStatsErr] = useState<string>('');

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      setStatsErr('');
      const res = await fetch('http://localhost:4002/api/admin/stats', { cache: 'no-store' });
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

  useEffect(() => { fetchStats(); }, []);
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

  /* ---------- DOCTORS + ACTIVE COUNTS & TODAY LIST ---------- */
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState<boolean>(true);
  const [doctorsErr, setDoctorsErr] = useState<string>('');

  // Active counts (Pending + Confirmed) per doctor
  const [activeCounts, setActiveCounts] = useState<Record<string, number>>({});
  const [countsLoading, setCountsLoading] = useState<boolean>(true);

  // Today’s approved appointments (for the dashboard card)
  const [todaysApproved, setTodaysApproved] = useState<ApiAppointment[]>([]);
  const [todayLoading, setTodayLoading] = useState<boolean>(true);

  const fetchDoctors = async () => {
    try {
      setDoctorsLoading(true);
      setDoctorsErr('');
      const res = await fetch('http://localhost:4002/api/doctors', { cache: 'no-store' });
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

  const fetchAppointmentsForDashboard = async () => {
    try {
      setCountsLoading(true);
      setTodayLoading(true);
      const u = new URL('http://localhost:4002/api/admin/appointments');
      u.searchParams.set('page', '1');
      u.searchParams.set('pageSize', '500');
      const res = await fetch(u.toString(), { cache: 'no-store' });
      const json: ApiResponse | any = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load appointments');

      const items: ApiAppointment[] = (json.items || []).map(normalizeItem);

      // Active = PENDING + CONFIRMED (for counts by doctor)
      const active = items.filter(a => a.status === 'PENDING' || a.status === 'CONFIRMED');

      const map: Record<string, number> = {};
      for (const a of active) {
        const key = normalize(a.doctor);
        if (!key) continue;
        map[key] = (map[key] ?? 0) + 1;
      }
      setActiveCounts(map);

      // Today's Approved = date == today(Manila) AND status == CONFIRMED
      const todayYMD = todayYMDManila();
      const todays = items
        .filter(a => a.status === 'CONFIRMED' && a.date === todayYMD)
        .sort((a, b) => (a.timeStart < b.timeStart ? -1 : a.timeStart > b.timeStart ? 1 : 0));

      setTodaysApproved(todays);
    } catch {
      // Keep last values on error
    } finally {
      setCountsLoading(false);
      setTodayLoading(false);
    }
  };

  const loadAll = async () => {
    await Promise.all([fetchDoctors(), fetchAppointmentsForDashboard()]);
  };

  useEffect(() => { loadAll(); }, []);
  useEffect(() => {
    const refresh = () => loadAll();
    window.addEventListener('appointments-updated', refresh);
    window.addEventListener('doctors-updated', refresh);
    window.addEventListener('focus', refresh);
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

            {/* Today's Appointments (dynamic: only CONFIRMED for Manila today) */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-10">Todays Appointments</h3>

              {/* Header row */}
              <div className="grid grid-cols-3 text-sm font-medium text-gray-600 mb-3 px-1">
                <span>Patient</span>
                <span>Date &amp; Time</span>
                <span className="text-left">Treatment type</span>
              </div>

              {todayLoading ? (
                <p className="text-sm text-gray-500 px-1">Loading today’s appointments…</p>
              ) : todaysApproved.length > 0 ? (
                <div className="space-y-3">
                  {todaysApproved.map((a) => {
                    const start12 = to12hSafe(a.timeStart);
                    const endHM = addMinutesSafe(a.timeStart, 120);
                    const end12 = endHM ? to12hSafe(endHM) : "—";
                    const timeRange = start12 !== "—" && end12 !== "—" ? `${start12}` : start12;
                    const dateDisp = fmtDateCompact(a.date);
                    return (
                      <div
                        key={a.id}
                        className="grid grid-cols-3 items-center gap-4 rounded-xl border border-gray-200 bg-white shadow-sm px-4 py-3"
                      >
                        <div className="truncate">
                          <p className="text-sm font-medium text-gray-900">{a.patientName || '—'}</p>
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-gray-900">{timeRange}</p>
                          <p className="text-xs text-gray-400">{dateDisp}</p>
                        </div>

                        <div className="text-left">
                          <p className="text-sm font-semibold text-gray-900">{a.service || '—'}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // No message when empty — renders nothing
                <div />
              )}
            </div>
          </div>
          {/* End Bottom Section */}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
