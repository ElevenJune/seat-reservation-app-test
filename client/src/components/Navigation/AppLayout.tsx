import { Outlet } from "react-router-dom";
import { Toolbar } from "./Toolbar";
import { VLayout } from "./Layout";

export function AppLayout() {
  return (
    <VLayout style={{ backgroundColor: "var(--background)", height:"100vh" }}>
      <Toolbar />
      <main style={{ flex: 1, display: "flex", flexDirection: "column", width:"100%" }}>
        <Outlet />
      </main>
    </VLayout>
  );
}