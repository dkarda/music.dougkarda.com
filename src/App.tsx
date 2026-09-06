import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Attended } from "./pages/Attended";
import { Birthdays } from "./pages/Birthdays";
import { Home } from "./pages/Home";
import { Releases } from "./pages/Releases";
import { SongOfTheDay } from "./pages/SongOfTheDay";
import { Upcoming } from "./pages/Upcoming";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/upcoming" element={<Upcoming />} />
        <Route path="/attended" element={<Attended />} />
        <Route path="/live-shows" element={<Navigate to="/upcoming" replace />} />
        <Route path="/song-of-the-day" element={<SongOfTheDay />} />
        <Route path="/birthdays" element={<Birthdays />} />
        <Route path="/releases" element={<Releases />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
