import "./polyfills";
import { lazy, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import LandingPage from "./LandingPage";
import "./styles.css";

const LiveApp = lazy(() => import("./LiveApp"));

function App() {
  const [route, setRoute] = useState(() => window.location.hash.startsWith("#app") ? "app" : "home");

  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash.startsWith("#app") ? "app" : "home");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return route === "app" ? <Suspense fallback={<div className="route-loading"><span /><strong>Opening Compart…</strong></div>}><LiveApp /></Suspense> : <LandingPage />;
}

createRoot(document.getElementById("root")!).render(<App />);
