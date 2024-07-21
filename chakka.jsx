import React, { useEffect, useState, useRef } from "react";
import Map from "ol/Map";
import View from "ol/View";
import GeoJSON from "ol/format/GeoJSON";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import { Circle as CircleStyle, Fill, Stroke, Style, Icon } from 'ol/style';
import Overlay from 'ol/Overlay';
import "ol/ol.css";
import OSM from "ol/source/OSM";
import { fromLonLat, toLonLat, transform } from 'ol/proj';
import LineString from 'ol/geom/LineString';
import { Polyline } from 'ol/format';
import axios from "axios";

import { AudioManager } from "../components/AudioManager";
import Transcript from "../components/Transcript";
import { useTranscriber } from "../hooks/useTranscriber";

import "rlayers/control/layers.css";

const origin = fromLonLat([2.364, 48.82]);

const MapComponent = ({ zoom, center, showParks, showNavigation }) => {
  const mapRef = useRef();
  const mapInstance = useRef();
  const parksLayer = useRef();
  const navigationLayer = useRef();
  const hoverCardRef = useRef();

  const [hoverInfo, setHoverInfo] = useState(null);
  const [startPoint, setStartPoint] = useState(undefined);
  const [endPoint, setEndPoint] = useState(undefined);
  const [route, setRoute] = useState(null);
  const [startAddress, setStartAddress] = useState("");
  const [endAddress, setEndAddress] = useState("");

  useEffect(() => {
    if (!mapInstance.current) {

      parksLayer.current = new VectorLayer({
        source: new VectorSource(),
        style: new Style({
          image: new CircleStyle({
            radius: 5,
            fill: new Fill({ color: 'green' }),
            stroke: new Stroke({ color: 'white', width: 1 }),
          }),
          fill: new Fill({ color: 'rgba(0, 128, 0, 0.2)' }),
          stroke: new Stroke({ color: 'green', width: 1 }),
        }),
      });

      navigationLayer.current = new VectorLayer({
        source: new VectorSource(),
        style: new Style({
          image: new Icon({
            anchor: [0.5, 1],
            src: 'https://openlayers.org/en/latest/examples/data/icon.png'
          }),
          stroke: new Stroke({
            color: 'blue',
            width: 4
          })
        })
      });

      mapInstance.current = new Map({
        target: mapRef.current,
        layers: [
          new TileLayer({
            source: new OSM(),
          }),
          parksLayer.current,
          navigationLayer.current,
        ],
        view: new View({
          center: center,
          zoom: zoom,
        }),
      });

      // Create overlay for hover card
      const hoverCard = new Overlay({
        element: hoverCardRef.current,
        positioning: 'bottom-center',
        stopEvent: false,
        offset: [0, -10],
      });
      mapInstance.current.addOverlay(hoverCard);

      // Add hover interaction for parks
      mapInstance.current.on('pointermove', (evt) => {
        const feature = mapInstance.current.forEachFeatureAtPixel(evt.pixel, (feature) => feature);
        if (feature && feature.get('name')) {
          const coordinate = evt.coordinate;
          setHoverInfo({
            name: feature.get('name'),
            description: feature.get('description') || '',
          });
          hoverCard.setPosition(coordinate);
        } else {
          setHoverInfo(null);
          hoverCard.setPosition(undefined);
        }
      });

      mapInstance.current.on('click', async(event) => {
        const clickedCoord = event.coordinate;
        console.log("Click detected at:", clickedCoord);
        if (!startPoint) {
          setStartPoint(clickedCoord);
          console.log("Setting start point");
          addMarker(clickedCoord, 'start');
          const addr = await getAddress(clickedCoord);
          console.log("Start address:", addr);
          setStartAddress(addr);
          console.log("start", startAddress);
        } else if (endAddress === "") {
          console.log("Setting end point");
          setEndPoint(clickedCoord);
          addMarker(clickedCoord, 'end');
          const addr = await getAddress(clickedCoord);
          console.log("End address:", addr);
          setEndAddress(addr);
          getRoute(startPoint, clickedCoord);
        } else {
          alert("Clearing route");
          clearRoute();
          setStartPoint(clickedCoord);
          setEndPoint(null);
          addMarker(clickedCoord, 'start');
          getAddress(clickedCoord).then(setStartAddress);
          setEndAddress("");
        }
      });
    }
  }, []);

  useEffect(() => {
    if (mapInstance.current) {
      mapInstance.current.getView().setZoom(zoom);
    }
  }, [zoom]);

  useEffect(() => {
    if (mapInstance.current) {
      mapInstance.current.getView().setCenter(center);
    }
  }, [center]);

  useEffect(() => {
    if (showParks) {
      fetchParks();
    } else {
      parksLayer.current.getSource().clear();
    }
  }, [showParks]);

  const fetchParks = () => {
    const extent = mapInstance.current.getView().calculateExtent(mapInstance.current.getSize());
    const [west, south, east, north] = extent.map(coord => toLonLat([coord, coord])).flat();
    
    const bboxString = `${south.toFixed(6)},${west.toFixed(6)},${north.toFixed(6)},${east.toFixed(6)}`;
    console.log(bboxString);

    const query = `
      [out:json];
      (
        node["leisure"="park"](20.0,77.0,24.0,88.0);
        way["leisure"="park"](20.0,77.0,24.0,88.0);
        relation["leisure"="park"](20.0,77.0,24.0,88.0);
      );
      out body;
      >;
      out skel qt;
    `;

    fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        const features = [];
        data.elements.forEach(element => {
          if (element.type === 'node' && element.tags && element.tags.leisure === 'park') {
            const feature = new Feature({
              geometry: new Point(fromLonLat([element.lon, element.lat])),
              name: element.tags.name || 'Unnamed Park'
            });
            features.push(feature);
          } else if (element.type === 'way' && element.tags && element.tags.leisure === 'park') {
            const coords = element.nodes.map(nodeId => {
              const node = data.elements.find(el => el.type === 'node' && el.id === nodeId);
              return fromLonLat([node.lon, node.lat]);
            });
            const feature = new Feature({
              geometry: new Polygon([coords]),
              name: element.tags.name || 'Unnamed Park'
            });
            features.push(feature);
          }
        });
        parksLayer.current.getSource().clear();
        parksLayer.current.getSource().addFeatures(features);
      })
      .catch(error => {
        console.error('Error fetching parks:', error);
      });
  };

  const addMarker = (coord, type) => {
    const feature = new Feature({
      geometry: new Point(coord),
      type: type
    });
    
    const style = new Style({
      image: new Icon({
        anchor: [0.5, 1],
        src: type === 'start' ? 'path/to/start-icon.png' : 'path/to/end-icon.png',
        scale: 0.5
      })
    });

    feature.setStyle(style);
    navigationLayer.current.getSource().addFeature(feature);
  };

  const getAddress = async (coord) => {
    const lonLat = toLonLat(coord);
    const response = await axios.get(`https://nominatim.openstreetmap.org/reverse`, {
      params: {
        format: 'json',
        lon: lonLat[0],
        lat: lonLat[1]
      }
    });
    return response.data.display_name;
  };

  const getRoute = async (start, end) => {
    const startLonLat = toLonLat(start);
    const endLonLat = toLonLat(end);
    const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${startLonLat[0]},${startLonLat[1]};${endLonLat[0]},${endLonLat[1]}?overview=full&geometries=polyline`);
    const data = await response.json();
    const route = new Polyline().readGeometry(data.routes[0].geometry, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857'
    });
    setRoute(route);
    addRouteToMap(route);
  };

  const addRouteToMap = (route) => {
    const routeFeature = new Feature({
      geometry: route,
      name: 'Route'
    });
    const routeStyle = new Style({
      stroke: new Stroke({
        color: 'blue',
        width: 4
      })
    });
    routeFeature.setStyle(routeStyle);
    navigationLayer.current.getSource().addFeature(routeFeature);
  };

  const clearRoute = () => {
    navigationLayer.current.getSource().clear();
    setStartPoint(null);
    setEndPoint(null);
    setRoute(null);
    setStartAddress("");
    setEndAddress("");
  };

  return (
    <div style={{ position: 'relative', width: "100%", height: "500px" }}>
      <div ref={mapRef} style={{ width: "100%", height: "100%" }}></div>
        <div ref={hoverCardRef} className="hover-card" style={{ display: hoverInfo ? 'block' : 'none' }}>
          <div className="card">
            <div className="card-header">
              <strong>{hoverInfo?.name}</strong>
            </div>
            <div className="card-body">
              <p>{hoverInfo?.description}</p>
            </div>
          </div>
        </div>
        {showNavigation && (
          <div className="navigation-info" style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'white', padding: '10px' }}>
            <p><strong>Start:</strong> {startAddress}</p>
            <p><strong>End:</strong> {endAddress}</p>
            <button onClick={clearRoute}>Clear Route</button>
          </div>
        )}
    </div>
  );
};

const Controls = ({ showParks, setShowParks }) => {
  return (
    <form className="d-flex gap-4">
      <div className="py-2">
        <input 
          type="checkbox" 
          id="Parks" 
          name="Parks" 
          checked={showParks} 
          onChange={(e)=> setShowParks(e.target.checked)}
        />
        <label htmlFor="Parks">Show Parks</label>
      </div>
    </form>
  );
};


const SearchBar = ({ setCenter, setZoom }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleSearch = async () => {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`);
    const data = await response.json();
    setResults(data);
  };

  const handleSelect = (result) => {
    setCenter(fromLonLat([parseFloat(result.lon), parseFloat(result.lat)]));
    setZoom(12);
    setResults([]);
    setQuery('');
  };

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for a place"
      />
      <button onClick={handleSearch}>Search</button>
      {results.length > 0 && (
        <ul>
          {results.map((result) => (
            <li key={result.place_id} onClick={() => handleSelect(result)}>
              {result.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
export default function MapMain() {
  const [zoom, setZoom] = useState(4);
  const [center, setCenter] = useState(fromLonLat([78.9629, 20.5937]));
  const [showParks, setShowParks] = useState(false);
  const [showNavigation, setShowNavigation] = useState(false);
  const transcriber = useTranscriber();

  useEffect(() => {
    // Check if responsiveVoice is available
    if (typeof window.responsiveVoice === 'undefined') {
      console.error('ResponsiveVoice is not available');
    }else{
      console.log('ResponsiveVoice is available');
    }
  }, []);

  const handleVoiceCommand = (command) => {
    const lowerCommand = command.replace(/!/g, '').toLowerCase().trim();
    
    if (lowerCommand.includes("zoom in")) {
      window.responsiveVoice.speak("zooming in", "Hindi Female");
      setZoom(prevZoom => Math.min(prevZoom + 1, 18));
    } else if (lowerCommand.includes("zoom out")) {
      window.responsiveVoice.speak("zooming out", "Hindi Female");
      setZoom(prevZoom => Math.max(prevZoom - 1, 1));
    } else if (lowerCommand.includes("show states")) {
      setStatesLayerVisible(true);
    } else if (lowerCommand.includes("hide states")) {
      setStatesLayerVisible(false);
    } else if (lowerCommand.includes("show districts")) {
      setDistrictsLayerVisible(true);
    } else if (lowerCommand.includes("hide districts")) {
      setDistrictsLayerVisible(false);
    } else if (lowerCommand.includes("show parks")) {
      setShowParks(true);
    } else if (lowerCommand.includes("hide parks")) {
      setShowParks(false);
    } else if (lowerCommand.startsWith("go to")) {
      const place = lowerCommand.replace("go to", "").trim();
      handleGoTo(place);
    }
  };

  useEffect(() => {
    if (transcriber.output && transcriber.output.text) {
      handleVoiceCommand(transcriber.output.text);
    }
  }, [transcriber.output]);

  // Function to handle "go to" commands
  const handleGoTo = async (place) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${place}`);
      const data = await response.json();
      if (data.length > 0) {
        window.responsiveVoice.speak(`going to ${place}`, "Hindi Female");
        const [lon, lat] = [parseFloat(data[0].lon), parseFloat(data[0].lat)];
        setCenter(fromLonLat([lon, lat]));
        setZoom(12);
      }
    } catch (error) {
      console.error("Error searching for place:", error);
    }
  };

  return (
    <>
      <div className='container flex flex-col justify-center items-center'>
          <AudioManager transcriber={transcriber} />
          <Transcript transcribedData={transcriber.output} />
      </div>

      <div>
        
      </div>

      <SearchBar setCenter={setCenter} setZoom={setZoom} />
      <MapComponent
        zoom={zoom}
        center={center}
        showParks={showParks}
        showNavigation={true}
      />
      <div className="w-full">
      </div>
      <Controls
        showParks={showParks}
        setShowParks={setShowParks}
      />
      <style jsx>{`
        .hover-card {
          position: absolute;
          background: white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
          padding: 15px;
          border-radius: 10px;
          border: 1px solid #cccccc;
          min-width: 280px;
        }
        .card-header {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .card-body {
          font-size: 14px;
        }
      `}</style>
    </>
  );
}