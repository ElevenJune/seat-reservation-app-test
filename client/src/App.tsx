import "./App.css";
import { useState } from "react";
import { 
  createBrowserRouter, 
  RouterProvider 
} from 'react-router-dom';

import { Section } from "./components/Section";
import { EventSelector } from "./components/EventSelector";



function App() {
  const router = createBrowserRouter([
  { path: '/', element: <EventSelector /> },
  { path: '/event/:id', element: <Section /> }
]);

  return (
    <section id="center">
      <div className="centered">
        <RouterProvider router={router} />
      </div>
    </section>
  );
}

export default App;
