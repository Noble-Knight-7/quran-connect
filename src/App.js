import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "./AuthContext";
import Login from "./Login";
import Navbar from "./Navbar";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Activity from "./pages/Activity";
import Community from "./pages/Community";

function App() {
  const { user } = useAuth();

  // Not logged in — show login page
  if (!user) return <Login />;

  // Logged in — show the full app with navigation
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-green-50">
        {/* Navbar appears on every page */}
        <Navbar />

        {/* Routes — each path loads a different page component */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/community" element={<Community />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
