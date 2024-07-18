const map = L.map('map').setView([51.505, -0.09], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
}).addTo(map);

// Initialize the routing control with the nominatim geocoder
const control = L.Routing.control({
  waypoints: [],
  routeWhileDragging: true,
  geocoder: L.Control.Geocoder.nominatim()
}).addTo(map);

const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const voiceText = document.getElementById('voice-text'); // Get the voice text element
const parksLayer = L.layerGroup().addTo(map);

// Add event listener for search input
searchInput.addEventListener('input', () => {
  const query = searchInput.value;
  searchResults.innerHTML = ''; // Clear previous results
  if (query.length > 2) {
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`)
      .then(response => response.json())
      .then(data => {
        if (data.length > 0) {
          data.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item.display_name;
            li.addEventListener('click', () => {
              const lat = item.lat;
              const lon = item.lon;
              map.setView([lat, lon], 13);
              searchInput.value = item.display_name; // Optional: update input with selected item
              searchResults.innerHTML = ''; // Clear results after selection
            });
            searchResults.appendChild(li);
          });
        }
      });
  }
});

// Voice commands using annyang
if (annyang) {
  annyang.addCallback('start', function() {
    console.log('Voice recognition started');
  });

  annyang.addCallback('error', function() {
    console.log('There was an error!');
  });

  annyang.addCallback('result', function(phrases) {
    console.log('Recognized phrase:', phrases[0]);
    voiceText.textContent = `You said: "${phrases[0]}"`;
  });
  let currentMarker = null;
  const commands = {
    'zoom to *location': (location) => {
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${location}`)
        .then(response => response.json())
        .then(data => {
          if (data.length > 0) {
            const lat = data[0].lat;
            const lon = data[0].lon;
            map.setView([lat, lon], 13);
            // Add a marker at the zoomed location
            if (currentMarker) {
              map.removeLayer(currentMarker);
            }
            currentMarker = L.marker([lat, lon]).addTo(map)
              .bindPopup(`You are zoomed to ${data[0].display_name}`)
              .openPopup();
          }
        });
    },

    'route from *start to *end': (start, end) => {
      Promise.all([
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${start}`)
          .then(response => response.json()),
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${end}`)
          .then(response => response.json())
      ]).then(locations => {
        const startLocation = locations[0][0];
        const endLocation = locations[1][0];
        if (startLocation && endLocation) {
          const startPoint = L.latLng(startLocation.lat, startLocation.lon);
          const endPoint = L.latLng(endLocation.lat, endLocation.lon);
          control.setWaypoints([startPoint, endPoint]);
        }
      });
    },
    'show road layer': () => {
        map.addLayer(roadLayer);
        map.removeLayer(highwayLayer); // Hide highways if they are displayed
        voiceText.textContent = 'Showing Road Layer';
      },
      'hide road layer': () => {
        map.removeLayer(roadLayer);
        voiceText.textContent = 'Hiding Road Layer';
      },
      'show highways': () => {
        map.addLayer(highwayLayer);
        map.removeLayer(roadLayer); // Hide road layer if it is displayed
        voiceText.textContent = 'Showing Highways';
      },
      'hide highways': () => {
        map.removeLayer(highwayLayer);
        voiceText.textContent = 'Hiding Highways';
      },
    'zoom in': () => {
      map.zoomIn();
    },
    'zoomIn': () => {
      map.zoomIn();
    },
    'zoom out': () => {
      map.zoomOut();
    },
    'move left': () => {
      map.panBy([-200, 0]); // Move 200 pixels left
    },
    'move right': () => {
      map.panBy([200, 0]); // Move 200 pixels right
    },
    'move up': () => {
      map.panBy([0, -200]); // Move 200 pixels up
    },
    'move down': () => {
      map.panBy([0, 200]); // Move 200 pixels down
    },
    'show parks': () => {
      const bounds = map.getBounds();
      const bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;
      
      const query = `
        [out:json][timeout:25];
        (
          node["leisure"="park"](${bbox});
          way["leisure"="park"](${bbox});
          relation["leisure"="park"](${bbox});
        );
        out body;
        >;
        out skel qt;
      `;

      fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
          parksLayer.clearLayers();
          data.elements.forEach(element => {
            if (element.type === 'node' && element.tags && element.tags.leisure === 'park') {
              L.marker([element.lat, element.lon])
                .bindPopup(element.tags.name || 'Unnamed Park')
                .addTo(parksLayer);
            } else if (element.type === 'way' && element.tags && element.tags.leisure === 'park') {
              // For ways, we need to fetch the nodes to create a polygon
              const coords = element.nodes.map(nodeId => {
                const node = data.elements.find(el => el.type === 'node' && el.id === nodeId);
                return [node.lat, node.lon];
              });
              L.polygon(coords)
                .bindPopup(element.tags.name || 'Unnamed Park')
                .addTo(parksLayer);
            }
            // Note: Relations are more complex and not handled in this simple example
          });
          voiceText.textContent = 'Showing Parks';
        })
        .catch(error => {
          console.error('Error fetching parks:', error);
          voiceText.textContent = 'Error fetching parks';
        });
    },

    'hide parks': () => {
      parksLayer.clearLayers();
      voiceText.textContent = 'Hiding Parks';
    }
  };

  annyang.addCommands(commands);
  annyang.start();
}
