// Main Application
class MapApp {
  constructor() {
    this.map = null;
    this.markers = [];
    this.markersCluster = null;
    this.routingControl = null;
    this.addMode = false;
    this.pendingMarkerLatLng = null;
    
    this.init();
  }
  
  init() {
    this.initMap();
    this.initEventListeners();
    this.loadMarkersFromStorage();
    this.updateStats();
  }
  
  initMap() {
    // Initialize map
    this.map = L.map('map', {
      attributionControl: false // Disable attribution control
    }).setView([14.5995, 120.9842], 5);
    
    // Define tile layers
    this.tileLayers = {
      osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
        attribution: '', // Empty attribution
        maxZoom: 19
      }),
      sat: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '', // Empty attribution
        maxZoom: 19
      }),
      dark: L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
        attribution: '', // Empty attribution
        maxZoom: 20
      })
    };
    
    // Add default tile layer
    this.tileLayers.osm.addTo(this.map);
    this.currentTileLayer = 'osm';
    
    // Add controls (without attribution)
    L.control.zoom({ position: 'topright' }).addTo(this.map);
    L.control.scale({ imperial: false }).addTo(this.map);
    
    // Initialize marker cluster
    this.markersCluster = L.markerClusterGroup().addTo(this.map);
    
    // Add some example markers
    this.addExampleMarkers();
  }
  
  initEventListeners() {
    // Location button
    document.getElementById('btn-location').addEventListener('click', () => {
      this.findUserLocation();
    });
    
    // Add marker button
    document.getElementById('btn-add-marker').addEventListener('click', () => {
      this.enableAddMode();
    });
    
    // Measure button
    document.getElementById('btn-measure').addEventListener('click', () => {
      this.toggleMeasureMode();
    });
    
    // Route button
    document.getElementById('btn-route').addEventListener('click', () => {
      this.toggleRouteMode();
    });
    
    // Clear button
    document.getElementById('btn-clear').addEventListener('click', () => {
      this.clearAllMarkers();
    });
    
    // Export button
    document.getElementById('btn-export').addEventListener('click', () => {
      this.exportMarkers();
    });
    
    // Search functionality
    document.getElementById('search-btn').addEventListener('click', () => {
      this.performSearch();
    });
    
    document.getElementById('search-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.performSearch();
    });
    
    // Map style selector
    document.getElementById('style-select').addEventListener('change', (e) => {
      this.changeTileLayer(e.target.value);
    });
    
    // Fullscreen button
    document.getElementById('btn-fullscreen').addEventListener('click', () => {
      this.toggleFullscreen();
    });
    
    // Modal events
    document.getElementById('cancel-marker').addEventListener('click', () => {
      this.closeMarkerModal();
    });
    
    document.getElementById('marker-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveMarkerFromForm();
    });
    
    document.querySelector('.close').addEventListener('click', () => {
      this.closeMarkerModal();
    });
    
    // Click outside modal to close
    window.addEventListener('click', (e) => {
      const modal = document.getElementById('marker-modal');
      if (e.target === modal) {
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
  
  addExampleMarkers() {
    this.addMarker(48.8584, 2.2945, "Eiffel Tower", "Paris, France", "🗼");
    this.addMarker(40.6892, -74.0445, "Statue of Liberty", "New York, USA", "🗽");
    this.addMarker(51.5007, -0.1246, "Big Ben", "London, UK", "🕰️");
  }
  
  addMarker(lat, lng, title, description = '', icon = '📍') {
    // Create custom icon
    const customIcon = L.divIcon({
      html: `<div style="font-size:20px">${icon}</div>`,
      className: 'custom-marker-icon',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
    
    // Create marker
    const marker = L.marker([lat, lng], { icon: customIcon });
    
    // Create popup content
    const popupContent = `
      <div class="marker-popup">
        <h3>${title}</h3>
        ${description ? `<p>${description}</p>` : ''}
        <div class="popup-actions">
          <button class="popup-btn delete-marker" data-id="${this.markers.length}">Delete</button>
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
    
    // Set up popup events after the popup is opened
    marker.on('popupopen', () => {
      // Add event listeners to popup buttons
      document.querySelector('.delete-marker').addEventListener('click', (e) => {
        const id = parseInt(e.target.getAttribute('data-id'));
        this.removeMarker(id);
        this.map.closePopup();
      });
    });
    
    return markerData.id;
  }
  
  addToSidebar(markerData) {
    const list = document.getElementById('locations-list');
    const item = document.createElement('div');
    item.className = 'loc';
    item.setAttribute('data-id', markerData.id);
    
    item.innerHTML = `
      <div class="icon">${markerData.icon}</div>
      <div class="loc-content">
        <div class="loc-title">${markerData.title}</div>
        <div class="small">${markerData.description || 'No description'}</div>
      </div>
      <div class="loc-actions">
        <button class="loc-action zoom-action" title="Zoom to marker">🔍</button>
        <button class="loc-action delete-action" title="Delete marker">🗑️</button>
      </div>
    `;
    
    // Add click event to zoom to marker
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.loc-actions')) {
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
      const sidebarItem = document.querySelector(`.loc[data-id="${id}"]`);
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
      
      this.showToast('Marker removed', 'info');
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
      }
    );
  }
  
  enableAddMode() {
    this.addMode = true;
    this.showToast('Click on the map to add a marker', 'info');
  }
  
  toggleMeasureMode() {
    this.showToast('Measurement mode would activate here', 'info');
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
      
      // Create new route
      this.routingControl = L.Routing.control({
        waypoints: [
          L.latLng(fromLocation.lat, fromLocation.lon),
          L.latLng(toLocation.lat, toLocation.lon)
        ],
        routeWhileDragging: false,
        lineOptions: {
          styles: [{ color: '#0ea5a4', weight: 5 }]
        }
      }).addTo(this.map);
      
      // Set up event listeners
      this.routingControl.on('routesfound', () => {
        document.getElementById('loading').classList.remove('active');
        this.showToast('Route calculated successfully', 'success');
      });
      
      this.routingControl.on('routingerror', () => {
        document.getElementById('loading').classList.remove('active');
        this.showToast('Routing failed. Try again.', 'error');
      });
      
    } catch (error) {
      document.getElementById('loading').classList.remove('active');
      throw error;
    }
  }
  
  clearAllMarkers() {
    if (confirm('Are you sure you want to remove all markers?')) {
      this.markersCluster.clearLayers();
      this.markers = [];
      document.getElementById('locations-list').innerHTML = '';
      this.saveMarkersToStorage();
      this.showToast('All markers cleared', 'info');
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
      this.showToast('No markers to export', 'info');
      return;
    }
    
    const dataStr = JSON.stringify(markersData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'map-markers.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    this.showToast('Markers exported successfully', 'success');
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
  
  openMarkerModal(latlng) {
    this.pendingMarkerLatLng = latlng;
    document.getElementById('marker-modal').style.display = 'block';
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
      this.showToast('Please enter a title for the marker', 'error');
      return;
    }
    
    const description = document.getElementById('marker-desc').value.trim();
    const icon = document.getElementById('marker-icon').value;
    
    this.addMarker(
      this.pendingMarkerLatLng.lat,
      this.pendingMarkerLatLng.lng,
      title,
      description,
      icon
    );
    
    this.closeMarkerModal();
    this.showToast('Marker added successfully', 'success');
    this.updateStats();
  }
  
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        this.showToast('Error attempting to enable fullscreen', 'error');
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
      localStorage.setItem('mapMarkers', JSON.stringify(markersData));
    } catch (error) {
      console.error('Failed to save markers to storage:', error);
    }
  }
  
  loadMarkersFromStorage() {
    try {
      const savedMarkers = localStorage.getItem('mapMarkers');
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
    toast.className = 'toast';
    toast.classList.add('show');
    
    // Add type class if provided
    if (type) {
      toast.classList.add(type);
    }
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.mapApp = new MapApp();
});
