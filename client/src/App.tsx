import "./App.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { Section } from "./components/Section";
import { EventSelector } from "./components/EventSelector";
import { Cart } from "./components/Cart";
import { AppLayout } from "./components/Navigation/AppLayout";

function App() {
  const router = createBrowserRouter([{
    element:<AppLayout/>,
    children:[
    { path: "/", element: <EventSelector /> },
    { path: "/event/:id", element: <Section /> },
    { path: "/cart", element: <Cart />}
  ]}]);

  return (
    <RouterProvider router={router} />
  );
}

export default App;
