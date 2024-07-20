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
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import Overlay from 'ol/Overlay';
import "ol/ol.css";
import OSM from "ol/source/OSM";
import { fromLonLat, toLonLat } from 'ol/proj';

import { AudioManager } from "../components/AudioManager";
import Transcript from "../components/Transcript";
import { useTranscriber } from "../hooks/useTranscriber";

const MapComponent = ({ zoom, statesLayerVisible, districtsLayerVisible, center, showParks }) => {
  const mapRef = useRef();
  const mapInstance = useRef();
  const parksLayer = useRef();
  const hoverCardRef = useRef();
  const [hoverInfo, setHoverInfo] = useState(null);

  useEffect(() => {
    if (!mapInstance.current) {
      const statesLayer = new VectorLayer({
        source: new VectorSource({
          url: "https://raw.githubusercontent.com/Subhash9325/GeoJson-Data-of-Indian-States/master/Indian_States",
          format: new GeoJSON(),
        }),
        visible: statesLayerVisible,
      });

      const districtsLayer = new VectorLayer({
        source: new VectorSource({
          url: "https://raw.githubusercontent.com/geohacker/india/master/district/india_district.geojson",
          format: new GeoJSON(),
        }),
        visible: districtsLayerVisible,
      });

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

      mapInstance.current = new Map({
        target: mapRef.current,
        layers: [
          new TileLayer({
            source: new OSM(),
          }),
          statesLayer,
          districtsLayer,
          parksLayer.current,
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

      // Add hover interaction
      // Add hover interaction
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
    if (mapInstance.current) {
      mapInstance.current.getLayers().getArray()[1].setVisible(statesLayerVisible);
    }
  }, [statesLayerVisible]);

  useEffect(() => {
    if (mapInstance.current) {
      mapInstance.current.getLayers().getArray()[2].setVisible(districtsLayerVisible);
    }
  }, [districtsLayerVisible]);

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
        // You might want to add some user feedback here, e.g., a toast notification
      });
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
    </div>
  );
};

const Controls = ({ statesLayerVisible, setStatesLayerVisible, districtsLayerVisible, setDistrictsLayerVisible, showParks, setShowParks }) => {
  return (
    <form className="d-flex gap-4">
  <div className="py-2">
    <input 
      type="checkbox" 
      id="States" 
      name="States" 
      checked={statesLayerVisible} 
      onChange={(e) => setStatesLayerVisible(e.target.checked)}
    />
    <label htmlFor="States">States</label>
  </div>
  <div className="py-2">
    <input 
      type="checkbox" 
      id="Districts" 
      name="Districts" 
      checked={districtsLayerVisible} 
      onChange={(e)=> setDistrictsLayerVisible(e.target.checked)}
    />
    <label htmlFor="Districts">Districts</label>
  </div>
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
  const [statesLayerVisible, setStatesLayerVisible] = useState(false);
  const [districtsLayerVisible, setDistrictsLayerVisible] = useState(false);
  const [center, setCenter] = useState([8700000, 2300000]);
  const [showParks, setShowParks] = useState(false);
  const transcriber = useTranscriber();

  const handleVoiceCommand = (command) => {
    const lowerCommand = command.replace(/!/g, '').toLowerCase().trim();
    
    if (lowerCommand.includes("zoom in")) {
      setZoom(prevZoom => Math.min(prevZoom + 1, 18));
    } else if (lowerCommand.includes("zoom out")) {
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

  // Function to handle "go to" commands
  const handleGoTo = async (place) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${place}`);
      const data = await response.json();
      if (data.length > 0) {
        const [lon, lat] = [parseFloat(data[0].lon), parseFloat(data[0].lat)];
        setCenter(fromLonLat([lon, lat]));
        setZoom(12);
      }
    } catch (error) {
      console.error("Error searching for place:", error);
    }
  };

  // Effect to process transcription when it's available
  useEffect(() => {
    if (transcriber.output && transcriber.output.text) {
      handleVoiceCommand(transcriber.output.text);
    }
  }, [transcriber.output]);

  return (
    <>
      <div className='container flex flex-col justify-center items-center'>
          <AudioManager transcriber={transcriber} />
          <Transcript transcribedData={transcriber.output} />
      </div>
      <SearchBar setCenter={setCenter} setZoom={setZoom} />
      <div className="w-20 flex justify-between">
        <button onClick={() => setZoom(zoom + 1)}>+</button>
        <button onClick={() => setZoom(zoom - 1)}>-</button>
      </div>
      <MapComponent
        zoom={zoom}
        statesLayerVisible={statesLayerVisible}
        districtsLayerVisible={districtsLayerVisible}
        center={center}
        showParks={showParks}
      />
      <Controls
        statesLayerVisible={statesLayerVisible}
        setStatesLayerVisible={setStatesLayerVisible}
        districtsLayerVisible={districtsLayerVisible}
        setDistrictsLayerVisible={setDistrictsLayerVisible}
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