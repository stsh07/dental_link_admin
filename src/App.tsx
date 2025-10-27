import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./components/LoginPage";
import Dashboard from "./components/Dashboard";
import ActiveAppointments from "./components/ActiveAppointments";
import AppointmentsHistory from "./components/AppointmentsHistory";
import Patients from "./components/Patients";
import Services from "./components/Services";
import Reviews from "./components/Reviews";
import Doctors from "./components/Doctors";
import ChangePassword from "./components/ChangePassword";

// FULL-PAGE details (not the popup component)
import DoctorProfile from "./components/DoctorProfile";

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

      {/* Doctors */}
      <Route path="/doctors" element={<Doctors />} />
      <Route path="/doctors/:id" element={<DoctorProfile />} />

      <Route path="/change-password" element={<ChangePassword />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;
