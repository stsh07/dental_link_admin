import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./components/LoginPage";
import Dashboard from "./components/Dashboard";
import ActiveAppointments from "./components/ActiveAppointments";
import AppointmentsHistory from "./components/AppointmentsHistory";
import Patients from "./components/Patients";
import Services from "./components/Services";
import Reviews from "./components/Reviews";
// import Doctors from "./components/Doctors";
import ChangePassword from "./components/ChangePassword";

const App: React.FC = () => {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LoginPage />} />

      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/appointments/active" element={<ActiveAppointments />} />
      <Route path="/appointments/history" element={<AppointmentsHistory />} />
      <Route path="/patients" element={<Patients />} />
      <Route path="/services" element={<Services />} />
      <Route path="/reviews" element={<Reviews />} />
      {/* <Route path="/doctors" element={<Doctors />} /> */}
      <Route path="/change-password" element={<ChangePassword />} />

      {/* Catch-all: send unknown paths to dashboard (not login) */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;
