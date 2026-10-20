import "./App.css";
import { useState } from "react";

import { Section } from "./components/Section";
import { EventSelector } from "./components/EventSelector";

function App() {
  const [eventId, setEventId] = useState<string>("");

  return (
    <section id="center">
      <EventSelector onEventChanged={setEventId} />
      <div className="filler">
        <Section eventId={eventId} />
      </div>
    </section>
  );
}

export default App;
