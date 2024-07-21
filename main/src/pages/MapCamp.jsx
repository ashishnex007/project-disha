import {AudioManager} from "../components/AudioManager";
import Transcript from "../components/Transcript";
import { useTranscriber } from "../hooks/useTranscriber";
import React, { useRef } from 'react';
import 'ol/ol.css';
import { RMap, ROSM } from 'rlayers';
import { fromLonLat } from 'ol/proj';

const Mapcamp = () => {
  const mapRef = useRef(null);
  const transcriber = useTranscriber();
  const zoomIn = () => {
    const view = mapRef.current.ol.getView();
    const zoom = view.getZoom();
    view.setZoom(zoom + 1);
  };

  const zoomOut = () => {
    const view = mapRef.current.ol.getView();
    const zoom = view.getZoom();
    view.setZoom(zoom - 1);
  };

  const goToHyderabad = () => {
    const view = mapRef.current.ol.getView();
    const hyderabadCoords = fromLonLat([78.4867, 17.3850]); // Coordinates for Hyderabad
    view.animate({
      center: hyderabadCoords,
      zoom: 12, // Adjust zoom level as needed
      duration: 2000 // Duration in milliseconds (2 seconds)
    });
  };

  return (
    <div>
        <div>
            <AudioManager transcriber={transcriber} />
            <Transcript transcribedData={transcriber.output} />
        </div>
      <RMap
        ref={mapRef}
        initial={{ center: fromLonLat([0, 0]), zoom: 2 }}
        className="map"
        width="100%"
        height="400px"
      >
        <ROSM />
      </RMap>
      <div className="controls">
        <button onClick={zoomIn}>Zoom In</button>
        <button onClick={zoomOut}>Zoom Out</button>
        <button onClick={goToHyderabad}>Go to Hyderabad</button>
      </div>
    </div>
  );
};

export default Mapcamp;
