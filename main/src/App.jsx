import { BrowserRouter, Route, Routes } from "react-router-dom";
import MapMain from "./pages/MapMain";
import Geolocation from "./components/maps/GeoLocation";
// import Mapcamp from "./pages/Mapcamp";

export default function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/">
          <Route
            index
            element={
                <MapMain />
            }
          />
        </Route>
        <Route path="/location">
          <Route
            index
            element={
                <Geolocation />
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}