import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "./AuthContext";
import Login from "./Login";
import Navbar from "./Navbar";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Activity from "./pages/Activity";
import Community from "./pages/Community";
import Quran from "./pages/Quran";
import SurahReader from "./pages/SurahReader";

function App() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Login />;

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <div className="min-h-screen bg-green-50">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/community" element={<Community />} />
          <Route path="/quran" element={<Quran />} />
          <Route path="/quran/:surahNumber" element={<SurahReader />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
