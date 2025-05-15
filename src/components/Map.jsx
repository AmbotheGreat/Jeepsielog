import React, { useEffect, useRef, useState } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { clsuToBalocWaitingAreas, balocToClsuWaitingAreas, mapConfig, ClsuToBalocTravelTimes, balocToClsuTravelTimes, clsuToBalocArrivalTimes, balocToClsuArrivalTimes } from '../data/jeepneyData';
import WaitingAreaSelector from './WaitingAreaSelector';
import SegmentedToggle from './SegmentedToggle';

// Helper to convert mm:ss to total seconds
function timeStringToSeconds(str) {
  if (!str) return 0;
  const [min, sec] = str.split(':').map(Number);
  return min * 60 + sec;
}

// Helper to convert seconds to mm:ss
function secondsToTimeString(sec) {
  sec = Math.max(0, sec);
  const min = Math.floor(sec / 60);
  const s = sec % 60;
  return `${min.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// Helper to format time as 'X min Y sec' or 'X sec'
function formatTimeDisplay(str) {
  const [min, sec] = str.split(':').map(Number);
  if (min === 0) return `${sec} sec`;
  if (sec === 0) return `${min} min`;
  return `${min} min ${sec} sec`;
}

// Helper to format time as 'HH:MM - X mins'
function formatTimeWithMinutes(str) {
  const [min, sec] = str.split(':').map(Number);
  const totalMinutes = min + (sec > 0 ? 1 : 0); // Round up if there are seconds
  return `${str} - ${totalMinutes} mins`;
}

// Update mapConfig containerStyle height to 100vh
mapConfig.containerStyle = {
  ...mapConfig.containerStyle,
  height: '100vh',
};

// Custom icon for user location (blue dot)
const userLocationIcon = {
  path: window?.google?.maps?.SymbolPath?.CIRCLE || 'M0,0 m -10, 0 a 10,10 0 1,0 20,0 a 10,10 0 1,0 -20,0',
  fillColor: '#4285F4',
  fillOpacity: 1,
  strokeColor: '#fff',
  strokeWeight: 2,
  scale: 6,
};

const MapComponent = () => {
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [selectedOrigin, setSelectedOrigin] = useState('');
  const [selectedDestination, setSelectedDestination] = useState('');
  const [directionsRenderer, setDirectionsRenderer] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [direction, setDirection] = useState('clsuToBaloc'); // 'clsuToBaloc' or 'balocToClsu'
  const [routeInfoWindow, setRouteInfoWindow] = useState(null);
  const [oppositeDirectionWarning, setOppositeDirectionWarning] = useState(false);
  const mapRef = useRef();
  const [userLocation, setUserLocation] = useState(null);
  const userMarkerRef = useRef(null);
  const [mapZoom, setMapZoom] = useState(mapConfig?.center?.zoom || 14);

  // Function to check if current day is weekend
  const isWeekend = () => {
    const today = new Date();
    const day = today.getDay();
    return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
  };

  // Choose data based on direction
  const waitingAreas = direction === 'clsuToBaloc' ? clsuToBalocWaitingAreas : balocToClsuWaitingAreas;
  const travelTimes = direction === 'clsuToBaloc' ? ClsuToBalocTravelTimes : balocToClsuTravelTimes;

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: mapConfig.apiKey,
    libraries: mapConfig.libraries,
    mapIds: [mapConfig.mapId]
  });

  useEffect(() => {
    if (isLoaded && map) {
      // Initialize directions renderer
      const renderer = new window.google.maps.DirectionsRenderer({
        suppressMarkers: true, // We'll use our custom markers
        polylineOptions: {
          strokeColor: '#2196F3',
          strokeWeight: 10, // wider for more visibility
          strokeOpacity: 1 // fully opaque
        }
      });
      renderer.setMap(map);
      setDirectionsRenderer(renderer);
    }
  }, [isLoaded, map]);

  useEffect(() => {
    if (isLoaded && map && directionsRenderer && selectedOrigin && selectedDestination) {
      const originLocation = waitingAreas.find(area => area.name === selectedOrigin);
      const destinationLocation = waitingAreas.find(area => area.name === selectedDestination);

      if (originLocation && destinationLocation) {
        // Find the indices of origin and destination in the waiting areas array
        const originIndex = waitingAreas.findIndex(area => area.name === selectedOrigin);
        const destIndex = waitingAreas.findIndex(area => area.name === selectedDestination);
        
        // Create waypoints for all stops between origin and destination
        const waypoints = [];
        if (originIndex < destIndex) {
          // Forward direction
          for (let i = originIndex + 1; i < destIndex; i++) {
            waypoints.push({
              location: new window.google.maps.LatLng(waitingAreas[i].lat, waitingAreas[i].lng),
              stopover: true
            });
          }
        } else {
          // Reverse direction
          for (let i = originIndex - 1; i > destIndex; i--) {
            waypoints.push({
              location: new window.google.maps.LatLng(waitingAreas[i].lat, waitingAreas[i].lng),
              stopover: true
            });
          }
        }

        const directionsService = new window.google.maps.DirectionsService();
        
        directionsService.route({
          origin: { lat: originLocation.lat, lng: originLocation.lng },
          destination: { lat: destinationLocation.lat, lng: destinationLocation.lng },
          waypoints: waypoints,
          optimizeWaypoints: false, // Keep waypoints in the specified order
          travelMode: window.google.maps.TravelMode.DRIVING
        }, (result, status) => {
          if (status === 'OK') {
            directionsRenderer.setDirections(result);
            
            // Calculate center of the route
            const bounds = new window.google.maps.LatLngBounds();
            result.routes[0].legs.forEach(leg => {
              bounds.extend(leg.start_location);
              bounds.extend(leg.end_location);
            });
            const center = bounds.getCenter();

            // Get distance from the route
            const distance = result.routes[0].legs[0].distance.text;

            // Use custom travel time logic with automatic weekday/weekend detection
            const originTimes = travelTimes[selectedOrigin];
            const destTimes = travelTimes[selectedDestination];
            let routeInfo = null;

            if (originTimes && destTimes) {
              // If origin is the first stop, just show destination times
              const firstStop = direction === 'clsuToBaloc' ? 'CLSU-Baloc' : 'BALOC-CLSU';
              if (selectedOrigin === firstStop) {
                routeInfo = {
                  shortest: destTimes[isWeekend() ? 'weekend' : 'weekday'].shortest,
                  longest: destTimes[isWeekend() ? 'weekend' : 'weekday'].longest,
                  distance: distance,
                  custom: true,
                  isWeekend: isWeekend()
                };
              } else {
                // Subtract origin from destination
                const shortest = secondsToTimeString(
                  timeStringToSeconds(destTimes[isWeekend() ? 'weekend' : 'weekday'].shortest) - 
                  timeStringToSeconds(originTimes[isWeekend() ? 'weekend' : 'weekday'].shortest)
                );
                const longest = secondsToTimeString(
                  timeStringToSeconds(destTimes[isWeekend() ? 'weekend' : 'weekday'].longest) - 
                  timeStringToSeconds(originTimes[isWeekend() ? 'weekend' : 'weekday'].longest)
                );
                routeInfo = {
                  shortest,
                  longest,
                  distance: distance,
                  custom: true,
                  isWeekend: isWeekend()
                };
              }
            } else {
              routeInfo = {
                message: 'Travel time data is only available for valid stops.',
                custom: true
              };
            }

            setRouteInfo(routeInfo);

            // Create or update route info window
            if (!routeInfoWindow) {
              const infoWindow = new window.google.maps.InfoWindow({
                position: center,
                content: createRouteInfoContent(routeInfo),
                pixelOffset: new window.google.maps.Size(0, -40)
              });
              infoWindow.open(map);
              setRouteInfoWindow(infoWindow);
            } else {
              routeInfoWindow.setPosition(center);
              routeInfoWindow.setContent(createRouteInfoContent(routeInfo));
            }

            map.fitBounds(bounds);
          }
        });
      }
    } else if (directionsRenderer) {
      // Clear the route if either origin or destination is not selected
      directionsRenderer.setDirections({ routes: [] });
      setRouteInfo(null);
      if (routeInfoWindow) {
        routeInfoWindow.close();
        setRouteInfoWindow(null);
      }
    }
  }, [selectedOrigin, selectedDestination, isLoaded, map, directionsRenderer, waitingAreas, travelTimes, direction]);

  useEffect(() => {
    if (isLoaded && map) {
      // Clear existing markerFs
      markers.forEach(marker => marker.map = null);
      
      // Create a single info window instance
      const infoWindow = new window.google.maps.InfoWindow();

      // Show only selected origin and destination markers if both are selected, otherwise show all
      let visibleAreas = waitingAreas;
      if (selectedOrigin && selectedDestination) {
        visibleAreas = waitingAreas.filter(area => area.name === selectedOrigin || area.name === selectedDestination);
      }

      // Helper: names of markers to highlight in yellow
      const yellowMarkers = [
        'Central Luzon State University Main Gate',
        'Wag-Wag Waiting Shed',
        'PhilRice Staff Ville',
        'PhilRice',
        'Munoz Brgy Hall'
      ];

      const newMarkers = visibleAreas.map((area) => {
        // Determine marker color based on selection or highlight
        let color = '#FF0000'; // Default color
        let letter = 'J'; // Default letter

        if (yellowMarkers.includes(area.name)) {
          color = '#FFD600'; // Yellow
        }
        if (area.name === selectedOrigin) {
          color = '#4CAF50'; // Green for origin
          letter = 'O';
        } else if (area.name === selectedDestination) {
          color = '#2196F3'; // Blue for destination
          letter = 'D';
        }

        const marker = new window.google.maps.marker.AdvancedMarkerElement({
          map,
          position: { lat: area.lat, lng: area.lng },
          title: area.name,
          content: createCustomPinElement(color, letter)
        });

        // Add click listener to show info window
        marker.addListener('gmp-click', () => {
          infoWindow.close();
          
          let content = `
            <div style="padding: 15px; padding-top: 0px; max-width: 250px;">
                <p style="margin: 0 0 8px 0; color: #666; text-align: start;">
                  <strong>Location:</strong> ${area.name}<br>
                </p>
                <p style="margin: 0 0 8px 0; color: #666; text-align: start;">
                  <strong>Description:</strong> ${area.description}
                </p>
                <p style="margin: 0 0 8px 0; color: #666; text-align: start;">
                  <strong>Operating Hours:</strong> ${area.operatingHours}
                </p>
          `;

          // Add route information if available and custom
          if (routeInfo && routeInfo.custom && (area.name === selectedOrigin || area.name === selectedDestination)) {
            if (routeInfo.message) {
              content += `<div style=\"margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee; color: #d32f2f; font-weight: bold;\">${routeInfo.message}</div>`;
            } else {
              content += `
                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee;">
                  <p style="margin: 0 0 8px 0; color: #2196F3; font-weight: bold;">
                    Route Information:
                  </p>
                  <p style="margin: 0 0 8px 0; color: #666;">
                    <strong>Shortest Travel Time:</strong> ${formatTimeDisplay(routeInfo.shortest)}
                  </p>
                  <p style="margin: 0; color: #666;">
                    <strong>Longest Travel Time:</strong> ${formatTimeDisplay(routeInfo.longest)}
                  </p>
                </div>
              `;
            }
          }

          content += `</div>`;
          infoWindow.setContent(content);
          infoWindow.open(map, marker);
        });

        return marker;
      });

      setMarkers(newMarkers);
    }

    return () => {
      markers.forEach(marker => marker.map = null);
    };
  }, [isLoaded, map, selectedOrigin, selectedDestination, routeInfo, waitingAreas]);

  // Helper function to create custom pin
  const createCustomPinElement = (color, letter) => {
    const pinElement = document.createElement('div');
    pinElement.style.backgroundColor = color;
    pinElement.style.border = '2px solid white';
    pinElement.style.borderRadius = '50%';
    pinElement.style.height = '40px';
    pinElement.style.width = '40px';
    pinElement.style.display = 'flex';
    pinElement.style.alignItems = 'center';
    pinElement.style.justifyContent = 'center';
    pinElement.style.color = 'white';
    pinElement.style.fontWeight = 'bold';
    
    if (letter === 'J') {
      const img = document.createElement('img');
      img.src = '/logo.png';
      img.style.width = '30px';
      img.style.height = '30px';
      img.style.objectFit = 'contain';
      pinElement.appendChild(img);
    }else if (letter === 'O') {
      const img = document.createElement('img');
      img.src = '/logo.png';
      img.style.width = '30px';
      img.style.height = '30px';
      img.style.objectFit = 'contain';
      pinElement.appendChild(img);
    }else if (letter === 'D') {
      const img = document.createElement('img');
      img.src = '/logo.png';
      img.style.width = '30px';
      img.style.height = '30px';
      img.style.objectFit = 'contain';
      pinElement.appendChild(img);
    }else {
      pinElement.textContent = letter;
    }
    
    return pinElement;
  };

  const onLoad = React.useCallback((mapInstance) => {
    mapRef.current = mapInstance;
    setMap(mapInstance);
    // Listen for zoom changes
    mapInstance.addListener('zoom_changed', () => {
      setMapZoom(mapInstance.getZoom());
    });
  }, []);

  // Function to check if destination is in opposite direction
  const isOppositeDirection = (origin, destination) => {
    if (!origin || !destination) return false;
    
    const originIndex = waitingAreas.findIndex(area => area.name === origin);
    const destIndex = waitingAreas.findIndex(area => area.name === destination);
    
    return destIndex < originIndex;
  };

  const handleOriginChange = (origin) => {
    setSelectedOrigin(origin);
    if (origin && selectedDestination) {
      const isOpposite = isOppositeDirection(origin, selectedDestination);
      setOppositeDirectionWarning(isOpposite);
    } else {
      setOppositeDirectionWarning(false);
    }
  };

  const handleDestinationChange = (destination) => {
    setSelectedDestination(destination);
    if (selectedOrigin && destination) {
      const isOpposite = isOppositeDirection(selectedOrigin, destination);
      setOppositeDirectionWarning(isOpposite);
    } else {
      setOppositeDirectionWarning(false);
    }
  };

  // Helper function to create route info content
  const createRouteInfoContent = (info) => {
    // Adjust font size and padding based on zoom
    // At zoom 18+: 16px font, 10px padding; at zoom 10: 12px font, 5px padding; interpolate between
    const minZoom = 10, maxZoom = 18;
    const minFont = 12, maxFont = 16;
    const minPad = 5, maxPad = 10;
    const z = Math.max(minZoom, Math.min(maxZoom, mapZoom));
    const fontSize = maxFont - ((z - minZoom) / (maxZoom - minZoom)) * (maxFont - minFont);
    const pad = maxPad - ((z - minZoom) / (maxZoom - minZoom)) * (maxPad - minPad);

    if (!info || !info.custom) return '';
    
    if (oppositeDirectionWarning) {
      return `
        <div style="
          padding: 15px;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          min-width: 250px;
          border: 1px solid #e0e0e0;
        ">
          <div style="
            color: #d32f2f;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V11H13V17ZM13 9H11V7H13V9Z" fill="#d32f2f"/>
            </svg>
            <span>You have selected a destination in the opposite direction. Please select a right destination after the current route.</span>
          </div>
        </div>
      `;
    }

    if (info.message) {
      return `
        <div style="
          padding: 15px;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          min-width: 250px;
          border: 1px solid #e0e0e0;
        ">
          <div style="
            color: #d32f2f;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V11H13V17ZM13 9H11V7H13V9Z" fill="#d32f2f"/>
            </svg>
            <span>${info.message}</span>
          </div>
        </div>
      `;
    }

    // Helper to format arrival time (in minutes)
    const formatArrival = (timeStr) => {
      if (!timeStr) return '';
      // If already ends with 'min', just return
      if (typeof timeStr === 'string' && timeStr.endsWith('min')) return timeStr;
      // Otherwise, treat as minutes
      return `${timeStr} min`;
    };

    // Get arrival time for the selected stop (destination)
    let arrivalData = null;
    if (direction === 'clsuToBaloc' && selectedDestination && clsuToBalocArrivalTimes[selectedDestination]) {
      arrivalData = clsuToBalocArrivalTimes[selectedDestination];
    } else if (direction === 'balocToClsu' && selectedDestination && balocToClsuArrivalTimes[selectedDestination]) {
      arrivalData = balocToClsuArrivalTimes[selectedDestination];
    }

    return `
      <div style="
        padding: ${pad}px 15px ${pad + 5}px 15px;
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        min-width: 180px;
        border: 1px solid #e0e0e0;
        font-size: ${fontSize}px;
      ">
        <div style="
          display: flex;
          align-items: center;
          margin-bottom: 8px;
          padding-bottom: 6px;
          border-bottom: 2px solid #42b815;
        ">
          <span style="
            font-weight: bold;
            color: #42b815;
            font-size: ${fontSize + 1}px;
          ">Estimated Travel Time (${info.isWeekend ? 'Weekend' : 'Weekday'}):</span>
        </div>
        <div style="
          display: flex;
          flex-direction: column;
          gap: ${Math.round(pad)}px;
        ">
          <div style="
            display: flex;
            align-items: center;
            gap: 8px;
            padding: ${pad}px;
            background-color: #f5f5f5;
            border-radius: 8px;
            border-left: 4px solid #42b815;
            position: relative;
            flex-direction: column;
            align-items: flex-start;
          ">
            <div style="display: flex; align-items: center; gap: 8px; width: 100%;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM12.5 7H11V13L16.2 16.2L17 14.9L12.5 12.2V7Z" fill="#42b815"/>
              </svg>
              <div style="
                font-size: ${fontSize + 8}px;
                font-weight: bold;
                color:rgb(202, 3, 3);
              ">${info.shortest === info.longest ? formatTimeDisplay(info.shortest) : `${formatTimeDisplay(info.shortest)} - ${formatTimeDisplay(info.longest)}`}</div>
            </div>
            <div style="margin-top: 4px; width: 100%;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <img src="/jeep.svg" alt="Jeep icon" style="width: 20px; height: 20px;" />
                <span style="color: #222; font-size: ${fontSize - 1}px; font-weight: 500;">Next jeep will arrive in about: <span style="color:rgb(40, 42, 161); font-weight: bold;">${arrivalData ? formatArrival(arrivalData.shortest) : '-'}</span> - <span style="color:rgb(40, 42, 161); font-weight: bold;">${arrivalData ? formatArrival(arrivalData.longest) : '-'}</span></span>
              </div>
            </div>
          </div>
          <div style="
            display: flex;
            align-items: center;
            padding: ${pad}px;
            background-color: #f5f5f5;
            border-radius: 8px;
            border-left: 4px solid #42b815;
          ">
            <div style="
              font-size: ${fontSize}px;
            ">Distance: ${info.distance}</div>
          </div>
        </div>
      </div>
    `;
  };

  useEffect(() => {
    // Get user location on mount
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          // Optionally handle error
        }
      );
    }
  }, []);

  // Always center map on user location
  useEffect(() => {
    if (userLocation && map) {
      map.setCenter(userLocation);
    }
  }, [userLocation, map]);

  // Center map on selected starting point (origin)
  useEffect(() => {
    if (selectedOrigin && map) {
      const originLocation = waitingAreas.find(area => area.name === selectedOrigin);
      if (originLocation) {
        map.setCenter({ lat: originLocation.lat, lng: originLocation.lng });
      }
    }
  }, [selectedOrigin, map, waitingAreas]);

  // Helper to create a red pin SVG for the user marker
  function createRedPinSVG() {
    const div = document.createElement('div');
    div.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center;">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g filter="url(#shadow)">
            <path d="M16 2C9.92487 2 5 6.92487 5 13C5 21.5 16 30 16 30C16 30 27 21.5 27 13C27 6.92487 22.0751 2 16 2Z" fill="#E53935"/>
            <circle cx="16" cy="13" r="5" fill="white"/>
          </g>
          <defs>
            <filter id="shadow" x="0" y="0" width="32" height="32" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
              <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.2"/>
            </filter>
          </defs>
        </svg>
        <span style="margin-top: 2px; color: black; font-size: 13px; font-weight: bold; background: white; padding: 2px 8px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">You are here!</span>
      </div>
    `;
    return div.firstElementChild;
  }

  // Add AdvancedMarkerElement for user location (red pin)
  useEffect(() => {
    if (window.google && window.google.maps && window.google.maps.marker && userLocation && map) {
      // Remove previous marker if exists
      if (userMarkerRef.current) {
        userMarkerRef.current.map = null;
        userMarkerRef.current = null;
      }
      // Create new advanced marker with red pin SVG
      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        map,
        position: userLocation,
        title: 'You are here',
        content: createRedPinSVG(),
      });
      userMarkerRef.current = marker;
      return () => {
        if (userMarkerRef.current) {
          userMarkerRef.current.map = null;
          userMarkerRef.current = null;
        }
      };
    }
  }, [userLocation, map]);

  if (loadError) return <div className="error">Error loading Google Maps</div>;
  if (!isLoaded) return <div className="loading">Loading Map...</div>;

  return (
    <div className="map-container" style={{ border: 'none', padding: '20px' }}>
      <div 
        className='map-header' 
        style={{
          border: 'none',
          marginBottom: '20px',
          width: '100%',
          borderRadius: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
          padding: '12px 18px',
        }}
      >
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            width: '100%', 
            gap: '12px', 
            flexWrap: 'nowrap',
            minWidth: 0
          }}
        >
          <img 
            src="/logo.png" 
            alt="Jeepsielog Logo" 
            className="w-24 h-24" 
            style={{ minWidth: 48, maxWidth: 96, height: 'auto', border: 'none', margin: '0 8px', flexShrink: 0 }} 
          />
          <h1 
            className="montserrat"
            style={{
              flex: 1,
              textAlign: 'center', 
              fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)',
              fontWeight: 700,
              color: '#222',
              margin: 0,
              letterSpacing: 0.5,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
            Track your travel time in Jeep
            <span style={{
              fontSize: '1.7rem',
              fontWeight: 700,
              color: '#ffe104',
              WebkitTextStroke: '1px black'
            }}>
              SIEL
            </span>
            og
          </h1>
          <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'flex-end', minWidth: 0 }}>
            <SegmentedToggle
              value={direction}
              onChange={(val) => {
                // Clear selections first
                setSelectedOrigin('');
                setSelectedDestination('');
                // Clear route info
                setRouteInfo(null);
                // Close info window if open
                if (routeInfoWindow) {
                  routeInfoWindow.close();
                  setRouteInfoWindow(null);
                }
                // Update direction last
                setDirection(val);
              }}
              options={[
                { value: 'clsuToBaloc', label: 'Clsu' },
                { value: 'balocToClsu', label: 'Baloc' }
              ]}
            />
          </div>
        </div>
        <div style={{ marginTop: 10, width: '100%' }}>
          <WaitingAreaSelector 
            key={direction}
            onOriginChange={handleOriginChange}
            onDestinationChange={handleDestinationChange}
            waitingAreas={waitingAreas}
          />
        </div>
        <style>{`
          @media (max-width: 900px) {
            .map-header > div:first-child { flex-direction: row !important; align-items: center !important; gap: 8px !important; flex-wrap: nowrap !important; }
            .map-header img { margin-bottom: 0 !important; }
            .map-header > div:last-child { margin-top: 10px !important; }
          }
          @media (max-width: 600px) {
            .map-header h1 { display: none !important; }
            .map-header > div:first-child { flex-direction: row !important; align-items: center !important; gap: 8px !important; flex-wrap: nowrap !important; }
            .map-header img { margin-bottom: 0 !important; }
            .map-header > div:last-child { margin-top: 10px !important; }
          }
        `}</style>
      </div>
      
      <GoogleMap
        mapContainerStyle={mapConfig.containerStyle}
        center={userLocation || mapConfig.center}
        zoom={14}
        onLoad={onLoad}
        options={{
          mapId: mapConfig.mapId,
          streetViewControl: false,
          mapTypeControl: true,
          fullscreenControl: true,
          fullscreenControlOptions: {
            position: window.google && window.google.maps ? window.google.maps.ControlPosition.TOP_RIGHT : 3
          },
          mapTypeControlOptions: {
            position: window.google && window.google.maps ? window.google.maps.ControlPosition.TOP_RIGHT : 3
          }
        }}
      >
        {/* Legend: Top left */}
        <div style={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 10,
          background: 'rgba(255,255,255,0.95)',
          borderRadius: 2,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          padding: '10px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          alignItems: 'flex-start',
          fontSize: 14,
          fontWeight: 500,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              display: 'inline-block',
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: '#FFD600',
              border: '2px solid #fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}></span>
            <span style={{ color: '#222' }}>Official Loading/Unloading Zone</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              display: 'inline-block',
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: '#FF0000',
              border: '2px solid #fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}></span>
            <span style={{ color: '#222' }}>Proposed Loading/Unloading Zone</span>
          </div>
        </div>
      </GoogleMap>
    </div>
  );
};

export default React.memo(MapComponent);