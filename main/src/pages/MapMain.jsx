import React, { useEffect, useMemo, useRef } from 'react';
import {AudioManager} from "../components/AudioManager";
import Transcript from "../components/Transcript";
import { useTranscriber } from "../hooks/useTranscriber";
import 'ol/ol.css';
import { fromLonLat, toLonLat  } from 'ol/proj';
import { LineString, Point } from "ol/geom";
import { Polyline } from "ol/format";
import XYZ from 'ol/source/XYZ';
import { MVT } from "ol/format";

import { RMap, ROSM, RLayerVector, RFeature, RLayerTile, RLayerVectorTile } from "rlayers";
import { RStyle, RCircle, RFill, RStroke } from "rlayers/style";

import { fillAddress, buildRoute } from "../utils/utils";

const origin = fromLonLat([1.2, 1.3]);

const Mapcamp = () => {
  const mapRef = useRef(null);
  const [view, setView] = React.useState({ center: origin, zoom: 3 });
  const [distance, setDistance] = React.useState(null);
  const [duration, setDuration] = React.useState(null);
  const parser = useMemo(() => new MVT(), []);

  useEffect(() => {
    if (typeof window.responsiveVoice === 'undefined') {
      console.error('ResponsiveVoice is not available');
    }else{
      console.log('ResponsiveVoice is available');
    }
  }, []);

  const transcriber = useTranscriber();

  useEffect(() => {
    if (transcriber.output && transcriber.output.text) {
      handleVoiceCommand(transcriber.output.text);
    }
  }, [transcriber.output]);

  const handleVoiceCommand = (command) => {
    const lowerCommand = command.replace(/!/g, '').toLowerCase().trim();
    
    if (lowerCommand.includes("zoom in")) {
      window.responsiveVoice.speak("zooming in", "Hindi Female");
      const view = mapRef.current.ol.getView();
      const zoom = view.getZoom();
      view.setZoom(zoom + 1);
    } else if (lowerCommand.includes("zoom out")) {
      window.responsiveVoice.speak("zooming out", "Hindi Female");
      const view = mapRef.current.ol.getView();
      const zoom = view.getZoom();
      view.setZoom(zoom - 1);
    } else if (lowerCommand.includes("show parks")) {
      setShowParks(true);
    } else if (lowerCommand.includes("hide parks")) {
      setShowParks(false);
    } else if (lowerCommand.startsWith("go to")) {
      const place = lowerCommand.replace("go to", "").trim().replace(/\.$/, "");
      handleGoTo(place);
    }
  };

  const handleGoTo = async(place) => {
    console.log(place);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${place}`);
      const data = await response.json();
      if (data.length > 0) {
        window.responsiveVoice.speak(`going to ${place}`, "Hindi Female");
        const [lon, lat] = [parseFloat(data[0].lon), parseFloat(data[0].lat)];
        console.log([lon, lat]);
        const view = mapRef.current.ol.getView();
        const placeCoords = fromLonLat([lon, lat]);
        view.animate({
          center: placeCoords,
          zoom: 12, // Adjust zoom level as needed
          duration: 2000 // Duration in milliseconds (2 seconds)
        });
      }
    } catch (error) {
      console.error(error);
    }
  }

  const [start, setStart] = React.useState(null);
  const [finish, setFinish] = React.useState(null);
  const Step = {
    START: 0,
    FINISH: 1,
  }
  const [step, setStep] = React.useState(Step.START);
  const [startAddress, setStartAddress] = React.useState("");
  const [finishAddress, setFinishAddress] = React.useState("");
  const [route, setRoute] = React.useState(null);

  // On start change
  React.useEffect(() => {
    fillAddress(start).then((address) => setStartAddress(address));
  }, [start]);

  // On finish change
  React.useEffect(() => {
    fillAddress(finish).then((address) => setFinishAddress(address));
  }, [finish]);

  // When either one changes
  React.useEffect(() => {
    buildRoute(start, finish).then(({ line, distance, duration }) => {
      setRoute(line);
      setDistance(distance);
      setDuration(duration);
    });
  }, [start, finish]);

  return (
    <div>
      <div>
          <AudioManager transcriber={transcriber} />
          <Transcript transcribedData={transcriber.output} />
      </div>

      <RMap
        ref={mapRef}
        initial={view}
        className="map"
        width="100%"
        height="400px"
        // projection= 'EPSG:3857'
        view={[view, setView]}
        onClick={(e) => {
          const coords = e.map.getCoordinateFromPixel(e.pixel);
          if (step === Step.START) {
            setFinish(null);
            setStart(new Point(coords));
            setStep(Step.FINISH);
          } else {
            setFinish(new Point(coords));
            setStep(Step.START);
          }
        }}
      >
        {/* <RLayerTile
          source={new XYZ({
            url: 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/MODIS_Terra_NDVI_8Day/default/2023-07-01/250m/{z}/{y}/{x}.png',
            attributions: 'Imagery courtesy NASA EOSDIS Worldview',
          })}
        /> */}
        {/* <RLayerTile
          source={new XYZ({
            url: 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/2023-07-01/250m/{z}/{y}/{x}.jpg',
            attributions: 'Imagery courtesy NASA EOSDIS Worldview',
          })}
        /> */}
        <ROSM />

        {/* // * NASA WW Vegetation */}
        {/* <RLayerTile
          properties={{ label: 'NASA World View - Vegetation' }}
          url="https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/MODIS_Terra_NDVI_8Day/default/2023-07-01/250m/{z}/{y}/{x}.png"
          attributions="Imagery courtesy NASA EOSDIS Worldview"
        /> */}

        {/* // * NASA WW Satellite */}
        {/* <RLayerTile
          properties={{ label: 'NASA World View - Satellite' }}
          url="https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/2023-07-01/250m/{z}/{y}/{x}.jpg"
          attributions="Imagery courtesy NASA EOSDIS Worldview"
        /> */}

        {/* 
          // * weather layers
          // * Clouds -> clouds_new
          // * Precipitation -> precipitation_new
          // * Sea level pressure -> pressure_new
          // * Wind speed -> wind_new
          // * Temperature -> temp_new 
        */}
        {/* <RLayerTile
          properties={{ label: 'OpenWeatherMap' }}
          url="https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=80aecfa13c9d93b97a677dd489483a21"
          attributions="Weather data © OpenWeatherMap"
        /> */}
        <RLayerVector>
          <RStyle>
            <RCircle radius={6}>
              <RFill color="blue" />
            </RCircle>
          </RStyle>
          <RFeature key={0} geometry={start} />
          <RFeature key={1} geometry={finish} />
          <RFeature key={2} geometry={route}>
            <RStyle>
              <RStroke width={3} color="darkgreen" />
            </RStyle>
          </RFeature>
        </RLayerVector>
      </RMap>

      {/* // * Display the start and finish points */}
      <div className="mx-0 mt-0 mb-3 p-1 w-100 jumbotron shadow">
        <p>
          <strong>
            Select {step === Step.START ? "START" : "FINISH"} point
          </strong>
        </p>
        <div className="d-flex mt-2 justify-content-between">
          {startAddress.length == 0 ? null : (
            <div>
              <strong>From: </strong>
              <em>{startAddress}</em>
            </div>
          )}
          {finishAddress.length == 0 ? null : (
            <div>
              <strong>To: </strong>
              <em>{finishAddress}</em>
            </div>
          )}
        </div>
        <div className="mt-3">
          {distance && <p><strong>Distance: </strong>{distance} km</p>}
          {duration && <p><strong>Estimated Time: </strong>{duration}</p>}
        </div>
      </div>
        
      {/* {//* Display the details} */}
      <div className="mx-0 mt-0 mb-3 p-1 w-100 jumbotron shadow d-flex flex-row justify-content-between">
        <div>
          Center is at
          <strong className="mx-1">
            {`${toLonLat(view.center)[1].toFixed(3)}° :
                    ${toLonLat(view.center)[0].toFixed(3)}°`}
          </strong>
        </div>
        <div>
          Zoom level is{" "}
          <strong className="mx-1">{Math.round(view.zoom)}</strong>
        </div>
        <div>
          Resolution is
          <strong className="mx-1">
            {view.resolution && view.resolution.toFixed(2)}m/pixel
          </strong>
        </div>
      </div>

    </div>
  );
};

export default Mapcamp;
