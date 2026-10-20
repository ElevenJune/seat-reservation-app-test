import "./App.css";
import { useState } from "react";
import { 
  createBrowserRouter, 
  RouterProvider 
} from 'react-router-dom';

import { Section } from "./components/Section";
import { EventSelector } from "./components/EventSelector";



function App() {
  const [eventId, setEventId] = useState<string>("");
  const router = createBrowserRouter([
  { path: '/', element: <EventSelector onEventChanged={setEventId} /> },
  { path: '/event', element: <Section eventId={eventId} /> }
]);

  return (
    <section id="center">
      <div className="filler">
        <RouterProvider router={router} />
      </div>
    </section>
  );
}

export default App;
