
import { BrowserRouter } from "react-router-dom";
import { AdminAuthProvider } from "./auth/AdminAuthContext";
import AppRoutes from "./routes/AppRoutes";

function App() {
  return (
    <AdminAuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AdminAuthProvider>
  );
}

export default App;
