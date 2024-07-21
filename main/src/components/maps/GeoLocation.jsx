import React from "react";
import { fromLonLat } from "ol/proj";
import { Geometry, Point } from "ol/geom";
import { Geolocation as OLGeoLoc } from "ol";
import "ol/ol.css";

import {
  RMap,
  ROSM,
  RLayerVector,
  RFeature,
  RGeolocation,
  RStyle,
  useOL,
} from "rlayers";
import {locationIcon} from "../icons/Icon";

function GeolocComp() {
  const [pos, setPos] = React.useState(new Point(fromLonLat([0, 0])));
  const [accuracy, setAccuracy] = React.useState(undefined);
  // Low-level access to the OpenLayers API
  const { map } = useOL();

  return (
    <>
      <RGeolocation
        tracking={true}
        trackingOptions={{ enableHighAccuracy: true }}
        onChange={React.useCallback(
          (e) => {
            const geoloc = e.target;
            setPos(new Point(geoloc.getPosition()));
            setAccuracy(geoloc.getAccuracyGeometry());

            map.getView().fit(geoloc.getAccuracyGeometry(), {
              duration: 250,
              maxZoom: 15,
            });
          },
          [map]
        )}
      />
      <RLayerVector zIndex={10}>
        <RStyle.RStyle>
          <RStyle.RIcon src={locationIcon} anchor={[0.5, 0.8]} />
          <RStyle.RStroke color={"#007bff"} width={3} />
        </RStyle.RStyle>
        <RFeature geometry={pos}></RFeature>
        <RFeature geometry={accuracy}></RFeature>
      </RLayerVector>
    </>
  );
}

export default function Geolocation() {
  return (
    <RMap
      className="example-map"
      initial={{ center: fromLonLat([0, 0]), zoom: 4 }}
    >
      <ROSM />
      <GeolocComp />
    </RMap>
  );
}