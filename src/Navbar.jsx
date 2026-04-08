import { Link, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation(); // tells you which page you're currently on

  // Helper — returns different classes depending on if the link is active
  const linkClass = (path) => {
    const isActive =
      location.pathname === path || location.pathname.startsWith(path + "/");
    return isActive
      ? "text-green-700 font-semibold border-b-2 border-green-600 pb-1"
      : "text-gray-400 hover:text-green-600 transition-colors pb-1";
  };

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-10">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <span className="text-green-800 font-bold text-lg">
          📖 Quran Connect
        </span>

        {/* Links */}
        <div className="flex items-center gap-6 text-sm">
          <Link to="/" className={linkClass("/")}>
            Home
          </Link>
          <Link to="/dashboard" className={linkClass("/dashboard")}>
            Dashboard
          </Link>
          <Link to="/activity" className={linkClass("/activity")}>
            Activity
          </Link>
          <Link to="/community" className={linkClass("/community")}>
            Community
          </Link>
          <Link to="/quran" className={linkClass("/quran")}>
            Quran
          </Link>
        </div>

        {/* User */}
        <div className="flex items-center gap-2">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              referrerPolicy="no-referrer"
              alt="profile"
              className="w-8 h-8 rounded-full border-2 border-green-200"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-green-700 flex items-center justify-center text-white text-xs font-bold">
              {user?.displayName?.charAt(0).toUpperCase()}
            </div>
          )}
          <button
            onClick={logout}
            className="text-xs text-gray-400 hover:text-red-400 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
