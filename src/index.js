import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./AuthContext";
import { QuranFoundationProvider } from "./context/QuranFoundationContext";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <AuthProvider>
      <QuranFoundationProvider>
        <App />
      </QuranFoundationProvider>
    </AuthProvider>
  </React.StrictMode>,
);
