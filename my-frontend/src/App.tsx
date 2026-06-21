import { useEffect, useState } from "react";
import WorkloadDashboard from "./pages/WorkloadDashboard";
import { ToastContainer } from "./components/ToastContainer";

export type Theme = "dark" | "light";

function App() {
  const [theme, setTheme] = useState<Theme>(() =>
    (localStorage.getItem("theme") as Theme) || "dark"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === "dark" ? "light" : "dark"));

  return (
    <>
      <WorkloadDashboard theme={theme} onToggleTheme={toggleTheme} />
      <ToastContainer />
    </>
  );
}

export default App;
