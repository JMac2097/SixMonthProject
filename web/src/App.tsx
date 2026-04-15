import { Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import { Layout } from './components/Layout';
import { ConnectionsPage } from './pages/ConnectionsPage';
import { RulesPage } from './pages/RulesPage';
import { RuleWizardPage } from './pages/RuleWizardPage';
import { RuleDetailPage } from './pages/RuleDetailPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/rules" replace />} />
        <Route path="/connections" element={<ConnectionsPage />} />
        <Route path="/rules" element={<RulesPage />} />
        <Route path="/rules/new" element={<RuleWizardPage />} />
        <Route path="/rules/:ruleId" element={<RuleDetailPage />} />
        <Route path="*" element={<Navigate to="/rules" replace />} />
      </Route>
    </Routes>
  );
}
