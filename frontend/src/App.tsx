import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./App.css";
import { routes } from "./application/routes";

const router = createBrowserRouter(routes);

const App = () => {
  return <RouterProvider router={router} />;
};

export default App;
