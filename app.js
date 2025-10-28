// Modern Map Application
class ModernMapApp {
  constructor() {
    this.map = null;
    this.markers = [];
    this.markersCluster = null;
    this.routingControl = null;
    this.addMode = false;
    this.pendingMarkerLatLng = null;
    this.currentCoordinates = { lat: 0, lng: 0 };
    
    this.init();
  }
  
  init() {
    this.initMap();
    this.initEventListeners();
    this.initUIComponents();
    this.loadMarkersFromStorage();
    this.updateStats();
    
    // Update coordinates display on map move
    this.map.on('mousemove', (e) => {
      this.updateCoordinatesDisplay(e.latlng);
    });
    
    console.log('Modern Map App initialized');
  }
  
  initMap() {
    // Initialize map with modern settings
    this.map = L.map('map', {
      attributionControl: false,
      zoomControl: false
    }).setView([14.5995, 120.9842], 5);
    
    // Define modern tile layers
    this.tileLayers = {
      osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '',
        maxZoom: 19
      }),
      sat: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '',
        maxZoom: 19
      }),
      dark: L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
        attribution: '',
        maxZoom: 20
      })
    };
    
    // Add default tile layer
    this.tileLayers.osm.addTo(this.map);
    this.currentTileLayer = 'osm';
    
    // Add custom zoom controls
    L.control.zoom({
      position: 'bottomright'
    }).addTo(this.map);
    
    // Initialize marker cluster with modern styling
    this.markersCluster = L.markerClusterGroup({
      iconCreateFunction: function (cluster) {
        const count = cluster.getChildCount();
        let size = 'large';
        
        if (count < 10) {
          size = 'small';
        } else if (count < 100) {
          size = 'medium';
        }
        
        return L.divIcon({
          html: `<div class="cluster-marker cluster-${size}">${count}</div>`,
          className: 'marker-cluster-custom',
          iconSize: L.point(40, 40)
        });
      }
    }).addTo(this.map);
    
    // Add example markers
    this.addExampleMarkers();
  }
  
  initEventListeners() {
    // Quick Actions
    document.getElementById('btn-location').addEventListener('click', () => {
      this.findUserLocation();
    });
    
    document.getElementById('btn-add-marker').addEventListener('click', () => {
      this.enableAddMode();
    });
    
    document.getElementById('btn-route').addEventListener('click', () => {
      this.toggleRouteMode();
    });
    
    // Tools
    document.getElementById('btn-measure').addEventListener('click', () => {
      this.toggleMeasureMode();
    });
    
    document.getElementById('btn-export').addEventListener('click', () => {
      this.exportMarkers();
    });
    
    document.getElementById('btn-clear').addEventListener('click', () => {
      this.clearAllMarkers();
    });
    
    document.getElementById('btn-fullscreen').addEventListener('click', () => {
      this.toggleFullscreen();
    });
    
    // Search
    document.getElementById('search-btn').addEventListener('click', () => {
      this.performSearch();
    });
    
    document.getElementById('search-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.performSearch();
    });
    
    // Map style selector
    document.querySelectorAll('.style-option').forEach(option => {
      option.addEventListener('click', (e) => {
        const style = e.currentTarget.dataset.style;
        this.changeTileLayer(style);
        
        // Update active state
        document.querySelectorAll('.style-option').forEach(opt => {
          opt.classList.remove('active');
        });
        e.currentTarget.classList.add('active');
      });
    });
    
    // Zoom controls
    document.getElementById('zoom-in').addEventListener('click', () => {
      this.map.zoomIn();
    });
    
    document.getElementById('zoom-out').addEventListener('click', () => {
      this.map.zoomOut();
    });
    
    // Modal events
    document.getElementById('cancel-marker').addEventListener('click', () => {
      this.closeMarkerModal();
    });
    
    document.getElementById('marker-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveMarkerFromForm();
    });
    
    document.querySelector('.modal-close').addEventListener('click', () => {
      this.closeMarkerModal();
    });
    
    // Click outside modal to close
    document.getElementById('marker-modal').addEventListener('click', (e) => {
      if (e.target === document.getElementById('marker-modal')) {
        this.closeMarkerModal();
      }
    });
    
    // Map click for adding markers
    this.map.on('click', (e) => {
      if (this.addMode) {
        this.openMarkerModal(e.latlng);
      }
    });
  }
  
  initUIComponents() {
    // Initialize any additional UI components
    this.updateCoordinatesDisplay({ lat: 14.5995, lng: 120.9842 });
  }
  
  addExampleMarkers() {
    this.addMarker(48.8584, 2.2945, "Eiffel Tower", "Paris, France", "🗼");
    this.addMarker(40.6892, -74.0445, "Statue of Liberty", "New York, USA", "🗽");
    this.addMarker(51.5007, -0.1246, "Big Ben", "London, UK", "🕰️");
  }
  
  addMarker(lat, lng, title, description = '', icon = '📍') {
    // Create modern marker icon
    const customIcon = L.divIcon({
      html: `
        <div class="modern-marker">
          <div class="marker-icon">${icon}</div>
          <div class="marker-pulse"></div>
        </div>
      `,
      className: 'custom-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });
    
    // Create marker
    const marker = L.marker([lat, lng], { icon: customIcon });
    
    // Create modern popup content
    const popupContent = `
      <div class="modern-popup">
        <div class="popup-header">
          <div class="popup-icon">${icon}</div>
          <h3 class="popup-title">${title}</h3>
        </div>
        ${description ? `<p class="popup-desc">${description}</p>` : ''}
        <div class="popup-actions">
          <button class="popup-btn delete-marker" data-id="${this.markers.length}">
            <span>Delete</span>
          </button>
          <button class="popup-btn zoom-marker" data-id="${this.markers.length}">
            <span>Zoom</span>
          </button>
        </div>
      </div>
    `;
    
    marker.bindPopup(popupContent);
    
    // Add to cluster
    this.markersCluster.addLayer(marker);
    
    // Store marker data
    const markerData = {
      id: this.markers.length,
      lat,
      lng,
      title,
      description,
      icon,
      marker: marker
    };
    
    this.markers.push(markerData);
    
    // Add to sidebar list
    this.addToSidebar(markerData);
    
    // Save to localStorage
    this.saveMarkersToStorage();
    
    // Set up popup events
    marker.on('popupopen', () => {
      document.querySelector('.delete-marker').addEventListener('click', (e) => {
        const id = parseInt(e.target.closest('.delete-marker').getAttribute('data-id'));
        this.removeMarker(id);
        this.map.closePopup();
      });
      
      document.querySelector('.zoom-marker').addEventListener('click', (e) => {
        const id = parseInt(e.target.closest('.zoom-marker').getAttribute('data-id'));
        this.zoomToMarker(id);
        this.map.closePopup();
      });
    });
    
    return markerData.id;
  }
  
  addToSidebar(markerData) {
    const list = document.getElementById('locations-list');
    const item = document.createElement('div');
    item.className = 'location-item';
    item.setAttribute('data-id', markerData.id);
    
    item.innerHTML = `
      <div class="location-icon">${markerData.icon}</div>
      <div class="location-content">
        <div class="location-title">${markerData.title}</div>
        <div class="location-desc">${markerData.description || 'No description'}</div>
      </div>
      <div class="location-actions">
        <button class="location-action zoom-action" title="Zoom to marker">🔍</button>
        <button class="location-action delete-action" title="Delete marker">🗑️</button>
      </div>
    `;
    
    // Add click event to zoom to marker
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.location-actions')) {
        this.zoomToMarker(markerData.id);
      }
    });
    
    // Add event for zoom button
    item.querySelector('.zoom-action').addEventListener('click', (e) => {
      e.stopPropagation();
      this.zoomToMarker(markerData.id);
    });
    
    // Add event for delete button
    item.querySelector('.delete-action').addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeMarker(markerData.id);
    });
    
    list.appendChild(item);
  }
  
  removeMarker(id) {
    const markerIndex = this.markers.findIndex(m => m.id === id);
    if (markerIndex !== -1) {
      // Remove from map
      this.markersCluster.removeLayer(this.markers[markerIndex].marker);
      
      // Remove from sidebar
      const sidebarItem = document.querySelector(`.location-item[data-id="${id}"]`);
      if (sidebarItem) {
        sidebarItem.remove();
      }
      
      // Remove from array
      this.markers.splice(markerIndex, 1);
      
      // Update IDs in remaining markers to avoid gaps
      this.markers.forEach((marker, index) => {
        marker.id = index;
      });
      
      // Update sidebar items with new IDs
      this.refreshSidebar();
      
      // Save to storage
      this.saveMarkersToStorage();
      
      this.showToast('Location removed', 'info');
      this.updateStats();
    }
  }
  
  refreshSidebar() {
    const list = document.getElementById('locations-list');
    list.innerHTML = '';
    
    this.markers.forEach(marker => {
      this.addToSidebar(marker);
    });
  }
  
  zoomToMarker(id) {
    const marker = this.markers.find(m => m.id === id);
    if (marker) {
      this.map.setView([marker.lat, marker.lng], 13);
      marker.marker.openPopup();
    }
  }
  
  findUserLocation() {
    if (!navigator.geolocation) {
      this.showToast('Geolocation is not supported by this browser', 'error');
      return;
    }
    
    this.showToast('Finding your location...', 'info');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        this.map.setView([latitude, longitude], 13);
        
        // Add a marker at user's location
        this.addMarker(
          latitude, 
          longitude, 
          'My Location', 
          'You are here', 
          '📍'
        );
        
        this.showToast('Location found!', 'success');
      },
      (error) => {
        let message = 'Unable to retrieve your location';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out';
            break;
        }
        this.showToast(message, 'error');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }
  
  enableAddMode() {
    this.addMode = true;
    this.showToast('Click anywhere on the map to add a location', 'info');
  }
  
  toggleMeasureMode() {
    this.showToast('Measurement tool activated', 'info');
    // Implementation would go here
  }
  
  toggleRouteMode() {
    if (this.routingControl) {
      this.map.removeControl(this.routingControl);
      this.routingControl = null;
      this.showToast('Route cleared', 'info');
    } else {
      this.promptForRoute();
    }
  }
  
  async promptForRoute() {
    const from = prompt("Start location", "Manila");
    if (!from) return;
    
    const to = prompt("Destination", "Cebu");
    if (!to) return;
    
    try {
      await this.calculateRoute(from, to);
    } catch (error) {
      this.showToast('Failed to calculate route: ' + error.message, 'error');
    }
  }
  
  async calculateRoute(from, to) {
    // Show loading
    document.getElementById('loading').classList.add('active');
    
    try {
      // Geocode both locations
      const fromLocation = await this.geocode(from);
      const toLocation = await this.geocode(to);
      
      if (!fromLocation || !toLocation) {
        throw new Error('Could not find one or both locations');
      }
      
      // Remove existing route if any
      if (this.routingControl) {
        this.map.removeControl(this.routingControl);
      }
      
      // Create new route with modern styling
      this.routingControl = L.Routing.control({
        waypoints: [
          L.latLng(fromLocation.lat, fromLocation.lon),
          L.latLng(toLocation.lat, toLocation.lon)
        ],
        routeWhileDragging: false,
        lineOptions: {
          styles: [
            { color: '#6366f1', weight: 6, opacity: 0.8 },
            { color: '#ffffff', weight: 3, opacity: 0.6 }
          ]
        },
        createMarker: (i, waypoint, n) => {
          const marker = L.marker(waypoint.latLng, {
            icon: L.divIcon({
              html: i === 0 ? 
                '<div class="route-marker start">A</div>' : 
                '<div class="route-marker end">B</div>',
              className: 'custom-route-marker',
              iconSize: [32, 32],
              iconAnchor: [16, 16]
            })
          });
          return marker;
        }
      }).addTo(this.map);
      
      // Set up event listeners
      this.routingControl.on('routesfound', (e) => {
        document.getElementById('loading').classList.remove('active');
        const routes = e.routes;
        const summary = routes[0].summary;
        
        // Display route info
        const distance = (summary.totalDistance / 1000).toFixed(2);
        const time = (summary.totalTime / 60).toFixed(0);
        
        this.showToast(`Route found: ${distance} km, ~${time} minutes`, 'success');
      });
      
      this.routingControl.on('routingerror', () => {
        document.getElementById('loading').classList.remove('active');
        this.showToast('Routing failed. Please try again.', 'error');
      });
      
    } catch (error) {
      document.getElementById('loading').classList.remove('active');
      throw error;
    }
  }
  
  clearAllMarkers() {
    if (confirm('Are you sure you want to remove all locations?')) {
      this.markersCluster.clearLayers();
      this.markers = [];
      document.getElementById('locations-list').innerHTML = '';
      this.saveMarkersToStorage();
      this.showToast('All locations cleared', 'info');
      this.updateStats();
    }
  }
  
  exportMarkers() {
    const markersData = this.markers.map(marker => ({
      lat: marker.lat,
      lng: marker.lng,
      title: marker.title,
      description: marker.description,
      icon: marker.icon
    }));
    
    if (markersData.length === 0) {
      this.showToast('No locations to export', 'info');
      return;
    }
    
    const dataStr = JSON.stringify(markersData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'geoexplorer-locations.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    this.showToast('Locations exported successfully', 'success');
  }
  
  async performSearch() {
    const query = document.getElementById('search-input').value.trim();
    if (!query) {
      this.showToast('Please enter a search term', 'info');
      return;
    }
    
    try {
      const result = await this.geocode(query);
      if (result) {
        this.map.setView([result.lat, result.lon], 12);
        
        // Add search result as a marker
        this.addMarker(
          result.lat, 
          result.lon, 
          result.display_name, 
          'Search result', 
          '🔍'
        );
        
        this.showToast('Location found!', 'success');
      } else {
        this.showToast('Location not found', 'error');
      }
    } catch (error) {
      this.showToast('Search failed: ' + error.message, 'error');
    }
  }
  
  async geocode(query) {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
    );
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        display_name: data[0].display_name
      };
    }
    return null;
  }
  
  changeTileLayer(layerName) {
    if (this.tileLayers[layerName] && this.currentTileLayer !== layerName) {
      this.map.removeLayer(this.tileLayers[this.currentTileLayer]);
      this.tileLayers[layerName].addTo(this.map);
      this.currentTileLayer = layerName;
    }
  }
  
  updateCoordinatesDisplay(latlng) {
    document.getElementById('lat-display').textContent = latlng.lat.toFixed(4);
    document.getElementById('lng-display').textContent = latlng.lng.toFixed(4);
  }
  
  openMarkerModal(latlng) {
    this.pendingMarkerLatLng = latlng;
    document.getElementById('marker-modal').style.display = 'flex';
    document.getElementById('marker-title').focus();
  }
  
  closeMarkerModal() {
    document.getElementById('marker-modal').style.display = 'none';
    document.getElementById('marker-form').reset();
    this.addMode = false;
    this.pendingMarkerLatLng = null;
  }
  
  saveMarkerFromForm() {
    const title = document.getElementById('marker-title').value.trim();
    if (!title) {
      this.showToast('Please enter a location name', 'error');
      return;
    }
    
    const description = document.getElementById('marker-desc').value.trim();
    const icon = document.querySelector('input[name="marker-icon"]:checked').value;
    
    this.addMarker(
      this.pendingMarkerLatLng.lat,
      this.pendingMarkerLatLng.lng,
      title,
      description,
      icon
    );
    
    this.closeMarkerModal();
    this.showToast('Location added successfully', 'success');
    this.updateStats();
  }
  
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        this.showToast('Error entering fullscreen mode', 'error');
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }
  
  updateStats() {
    document.getElementById('marker-count').textContent = this.markers.length;
  }
  
  saveMarkersToStorage() {
    try {
      const markersData = this.markers.map(marker => ({
        lat: marker.lat,
        lng: marker.lng,
        title: marker.title,
        description: marker.description,
        icon: marker.icon
      }));
      localStorage.setItem('geoexplorerMarkers', JSON.stringify(markersData));
    } catch (error) {
      console.error('Failed to save markers to storage:', error);
    }
  }
  
  loadMarkersFromStorage() {
    try {
      const savedMarkers = localStorage.getItem('geoexplorerMarkers');
      if (savedMarkers) {
        const markersData = JSON.parse(savedMarkers);
        markersData.forEach(marker => {
          this.addMarker(
            marker.lat,
            marker.lng,
            marker.title,
            marker.description,
            marker.icon
          );
        });
      }
    } catch (error) {
      console.error('Failed to load markers from storage:', error);
    }
  }
  
  showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast ' + type;
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 4000);
  }
}

// Add custom CSS for modern markers and clusters
const style = document.createElement('style');
style.textContent = `
  .modern-marker {
    position: relative;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .marker-icon {
    width: 24px;
    height: 24px;
    background: #6366f1;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: white;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    z-index: 2;
    position: relative;
  }
  
  .marker-icon::before {
    content: '';
    transform: rotate(45deg);
  }
  
  .marker-pulse {
    position: absolute;
    top: 0;
    left: 0;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(99, 102, 241, 0.3);
    animation: pulse 2s infinite;
    z-index: 1;
  }
  
  @keyframes pulse {
    0% {
      transform: scale(0.8);
      opacity: 1;
    }
    100% {
      transform: scale(1.5);
      opacity: 0;
    }
  }
  
  .modern-popup {
    padding: 0;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  }
  
  .popup-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
  }
  
  .popup-icon {
    font-size: 16px;
  }
  
  .popup-title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }
  
  .popup-desc {
    padding: 12px 16px;
    margin: 0;
    font-size: 13px;
    color: #666;
    border-bottom: 1px solid #eee;
  }
  
  .popup-actions {
    display: flex;
    padding: 8px;
    gap: 4px;
  }
  
  .popup-btn {
    flex: 1;
    padding: 6px 12px;
    border: none;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .popup-btn:first-child {
    background: #ef4444;
    color: white;
  }
  
  .popup-btn:last-child {
    background: #e5e7eb;
    color: #374151;
  }
  
  .popup-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .cluster-marker {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    border: 3px solid white;
  }
  
  .cluster-small {
    width: 36px;
    height: 36px;
    font-size: 12px;
  }
  
  .cluster-medium {
    width: 44px;
    height: 44px;
    font-size: 14px;
  }
  
  .cluster-large {
    width: 52px;
    height: 52px;
    font-size: 16px;
  }
  
  .route-marker {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 700;
    font-size: 14px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  }
  
  .route-marker.start {
    background: #10b981;
  }
  
  .route-marker.end {
    background: #ef4444;
  }
`;
document.head.appendChild(style);

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.modernMapApp = new ModernMapApp();
});
