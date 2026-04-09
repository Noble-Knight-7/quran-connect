import { Link, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const linkClass = (path) => {
    // Exact match for Home, startsWith for others
    const isActive =
      path === "/"
        ? location.pathname === "/"
        : location.pathname.startsWith(path);

    return isActive
      ? "text-green-700 font-bold scale-105"
      : "text-gray-500 hover:text-green-600 transition-all";
  };

  const navLinks = [
    { name: "Home", path: "/", icon: "🏠" },
    { name: "Dashboard", path: "/dashboard", icon: "📊" },
    { name: "Activity", path: "/activity", icon: "🕒" },
    { name: "Community", path: "/community", icon: "🤝" },
    { name: "Quran", path: "/quran", icon: "📖" },
  ];

  return (
    <>
      {/* --- TOP NAVBAR (Desktop/Tablet) --- */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo with slight flair */}
          <Link to="/" className="flex items-center gap-2 group">
            <span className="text-2xl group-hover:rotate-12 transition-transform">
              📖
            </span>
            <span className="text-green-900 font-black text-xl tracking-tight">
              Quran<span className="text-green-600">Connect</span>
            </span>
          </Link>

          {/* Desktop Links - Hidden on Mobile */}
          <div className="hidden md:flex items-center gap-8 text-[15px] font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={linkClass(link.path)}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right leading-none">
              <p className="text-xs font-bold text-gray-800">
                {user?.displayName?.split(" ")[0]}
              </p>
              <button
                onClick={logout}
                className="text-[10px] text-gray-400 hover:text-red-500 uppercase tracking-widest transition-colors"
              >
                Sign out
              </button>
            </div>

            {user?.photoURL ? (
              <img
                src={user.photoURL}
                referrerPolicy="no-referrer"
                alt="profile"
                className="w-10 h-10 rounded-xl border-2 border-green-100 object-cover shadow-sm"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center text-white font-bold shadow-md">
                {user?.displayName?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* --- BOTTOM NAVIGATION (Mobile Only) --- */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        {navLinks.map((link) => {
          const isActive =
            link.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(link.path);
          return (
            <Link
              key={link.path}
              to={link.path}
              className="flex flex-col items-center gap-1"
            >
              <span
                className={`text-xl ${isActive ? "opacity-100" : "opacity-50"}`}
              >
                {link.icon}
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-tighter ${isActive ? "text-green-700" : "text-gray-400"}`}
              >
                {link.name}
              </span>
            </Link>
          );
        })}
      </div>
    </>
  );
}

export default Navbar;
