import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Index';
import MonitorPage from '@/pages/Monitor';
import CamerasPage from '@/pages/Cameras';
import ReportsPage from '@/pages/Reports';
import HistoryPage from '@/pages/History';
import ZonesPage from '@/pages/Zones';
import SectorsPage from '@/pages/Sectors';
import GroupsPage from '@/pages/Groups';
import FacialRecognitionPage from '@/pages/FacialRecognition';
import FacialReportsPage from '@/pages/FacialReports';
import AuthCallback from '@/pages/AuthCallback';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route
          path="*"
          element={
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/monitor" element={<MonitorPage />} />
                <Route path="/cameras" element={<CamerasPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/zones" element={<ZonesPage />} />
                <Route path="/sectors" element={<SectorsPage />} />
                <Route path="/groups" element={<GroupsPage />} />
                <Route path="/facial-recognition" element={<FacialRecognitionPage />} />
                <Route path="/facial-reports" element={<FacialReportsPage />} />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;