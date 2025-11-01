import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./components/LoginPage";
import Dashboard from "./components/Dashboard";
import ActiveAppointments from "./components/ActiveAppointments";
import AppointmentsHistory from "./components/AppointmentsHistory";
import Patients from "./components/Patients";
import Services from "./components/Services";
import Reviews from "./components/Reviews";
import Doctors from "./components/Doctors";
import DoctorProfile from "./components/DoctorProfile";
import ChangePassword from "./components/ChangePassword";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/appointments/active" element={<ActiveAppointments />} />
      <Route path="/appointments/history" element={<AppointmentsHistory />} />

      {/* both routes use the same Patients component */}
      <Route path="/patients" element={<Patients />} />
      <Route path="/patients/:id" element={<Patients />} />

      <Route path="/doctors" element={<Doctors />} />
      <Route path="/doctors/:id" element={<DoctorProfile />} />
      <Route path="/services" element={<Services />} />
      <Route path="/reviews" element={<Reviews />} />
      <Route path="/change-password" element={<ChangePassword />} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
