import { Navigate } from "react-router-dom";

// Root / redirects to the landing page
export default function Index() {
  return <Navigate to="/landing" replace />;
}
