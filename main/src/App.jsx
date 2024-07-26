import { BrowserRouter, Route, Routes } from "react-router-dom";
import MapMain from "./pages/MapMain";
import {LandingPage} from "./pages/LandingPage";
import Auth from "./pages/Auth";
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
        <Route path="/landing">
          <Route
            index
            element={
                <LandingPage />
            }
          />
        </Route>
        <Route path="/auth">
          <Route
            index
            element={
                <Auth />
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}