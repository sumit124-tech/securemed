import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import PublicLayout from './components/PublicLayout';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';
import ErrorBoundary from './components/ErrorBoundary';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import CreateRecord from './pages/CreateRecord';
import RecordDetails from './pages/RecordDetails';
import AuditTrail from './pages/AuditTrail';
import MyPatients from './pages/MyPatients';
import MedicalRecords from './pages/MedicalRecords';
import AccessRequests from './pages/AccessRequests';
import AdminDashboard from './pages/AdminDashboard';

import HowItWorks from './pages/public/HowItWorks';
import Features from './pages/public/Features';
import Security from './pages/public/Security';
import Patients from './pages/public/Patients';
import Doctors from './pages/public/Doctors';
import About from './pages/public/About';

import './styles/global.css';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <Routes>
            {/* Public Routes with Public Navbar/Footer */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/features" element={<Features />} />
              <Route path="/security" element={<Security />} />
              <Route path="/patients" element={<Patients />} />
              <Route path="/doctors" element={<Doctors />} />
              <Route path="/about" element={<About />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>

            {/* Authenticated Routes with Sidebar Layout */}
            <Route element={<Layout />}>
              {/* Patient Routes */}
              <Route element={<ProtectedRoute allowedRoles={['PATIENT']} />}>
                <Route path="patient-dashboard" element={<PatientDashboard />} />
                <Route path="medical-records" element={<MedicalRecords />} />
                <Route path="access-requests" element={<AccessRequests />} />
              </Route>

              {/* Doctor Routes */}
              <Route element={<ProtectedRoute allowedRoles={['DOCTOR']} />}>
                <Route path="doctor-dashboard" element={<DoctorDashboard />} />
                <Route path="my-patients" element={<MyPatients />} />
                <Route path="create-record/:patientId" element={<CreateRecord />} />
              </Route>

              {/* Shared Protected Routes */}
              <Route element={<ProtectedRoute allowedRoles={['PATIENT', 'DOCTOR', 'ADMIN']} />}>
                <Route path="record/:recordId" element={<RecordDetails />} />
                <Route path="audit-trail" element={<AuditTrail />} />
              </Route>

              {/* Admin Routes */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route path="admin-dashboard" element={<AdminDashboard />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
