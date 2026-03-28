import { useAuth } from "./AuthContext";

function Login() {
  const { loginWithGoogle } = useAuth();

  return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center px-4">
      <h1 className="text-5xl font-bold text-green-800 mb-2">Quran Connect</h1>
      <p className="text-2xl text-green-600 mb-2">
        بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
      </p>
      <p className="text-gray-400 mb-12">
        Stay connected with the Quran — every single day
      </p>

      <div className="bg-white rounded-2xl p-10 shadow-md w-full max-w-sm text-center">
        <p className="text-4xl mb-4">📖</p>
        <h2 className="text-xl font-semibold text-green-800 mb-2">Welcome</h2>
        <p className="text-gray-400 text-sm mb-8">
          Sign in to track your reading streak, earn badges, and join the
          community.
        </p>

        <button
          onClick={loginWithGoogle}
          className="flex items-center justify-center gap-3 w-full border border-gray-200 rounded-xl py-3 px-6 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {/* Google's G icon using SVG — no image needed */}
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
            />
            <path
              fill="#FBBC05"
              d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z"
            />
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  );
}

export default Login;
