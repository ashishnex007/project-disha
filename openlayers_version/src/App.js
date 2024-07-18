import { BrowserRouter, Route, Routes } from "react-router-dom";
import MapMain from "./pages/MapMain";

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
      </Routes>
    </BrowserRouter>
  )
}
