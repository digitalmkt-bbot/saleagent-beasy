import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Customers from './pages/Customers.jsx';
import CustomerDetail from './pages/CustomerDetail.jsx';
import Activities from './pages/Activities.jsx';
import Checkin from './pages/Checkin.jsx';
import Rates from './pages/Rates.jsx';
import Users from './pages/Users.jsx';
import Projects from './pages/Projects.jsx';
import ProjectDetail from './pages/ProjectDetail.jsx';
import Quotations from './pages/Quotations.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';
import B2BDashboard from './pages/B2BDashboard.jsx';
import InvestIQ from './pages/InvestIQ.jsx';

function Private({ children }) { const { user } = useAuth(); return user ? children : <Navigate to="/login" replace />; }

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Private><Layout /></Private>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/customers/:id" element={<CustomerDetail />} />
        <Route path="/activities" element={<Activities />} />
        <Route path="/checkin" element={<Checkin />} />
        <Route path="/rates" element={<Rates />} />
        <Route path="/users" element={<Users />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/quotations" element={<Quotations />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/b2b-dashboard" element={<B2BDashboard />} />
        <Route path="/investiq" element={<InvestIQ />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
