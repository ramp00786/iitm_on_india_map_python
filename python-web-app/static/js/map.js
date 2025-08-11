/**
 * India Interactive Map - JavaScript
 * Handles map initialization, layer management, and user interactions
 */

class IndiaInteractiveMap {
    constructor() {
        this.map = null;
        this.stateLayer = null;
        this.districtLayer = null;
        this.sitesLayer = null; // Layer for sites
        this.instrumentsLayer = null; // Layer for instruments
        this.currentBaseLayer = null;
        this.selectedFeature = null;
        this.stateCount = 0;
        this.districtCount = 0;
        this.projectCount = 0;
        this.siteCount = 0;
        this.instrumentCount = 0; // Track instrument count
        this.indiaMaskLayer = null;
        
        this.mapStyles = {
            satellite: {
                name: 'Satellite',
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                attribution: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
                bounds: L.latLngBounds([5.0, 67.0], [39.0, 99.0]) // Restrict to India region
            },
            streets: {
                name: 'Streets',
                url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                bounds: L.latLngBounds([5.0, 67.0], [39.0, 99.0]) // Restrict to India region
            },
            topographic: {
                name: 'Topographic',
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
                attribution: '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community',
                bounds: L.latLngBounds([5.0, 67.0], [39.0, 99.0]) // Restrict to India region
            },
            osm: {
                name: 'OpenStreetMap',
                url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                bounds: L.latLngBounds([5.0, 67.0], [39.0, 99.0]) // Restrict to India region
            }
        };
        
        this.init();
    }
    
    async init() {
        try {
            this.initializeMap();
            this.setupEventListeners();
            await this.loadGeoJSONLayers();
            await this.loadProjectData(); // Load project markers
            this.hideLoading();
            this.updateStatistics();
        } catch (error) {
            console.error('Error initializing map:', error);
            this.showError('Failed to initialize map: ' + error.message);
        }
    }
    
    initializeMap() {
        // India's precise bounds based on the shapefile data
        const indiaBounds = L.latLngBounds([6.754, 68.186], [37.042, 97.415]);
        
        // Create map with India bounds and restrictions
        this.map = L.map('map', {
            center: [20.5937, 78.9629],
            zoom: 5,
            zoomControl: true,
            scrollWheelZoom: true,
            doubleClickZoom: true,
            boxZoom: true,
            keyboard: true,
            dragging: true,
            touchZoom: true,
            // Restrict map bounds to India only
            maxBounds: indiaBounds,
            maxBoundsViscosity: 1.0, // How hard the bounds are (1.0 = very hard)
            minZoom: 4, // Prevent zooming out too far
            maxZoom: 18,
            // Performance optimizations
            preferCanvas: true,
            zoomAnimation: true,
            zoomAnimationThreshold: 4
        });
        
        // Initialize masking layer first (before tiles to prevent world flash)
        this.indiaMaskLayer = L.layerGroup();
        
        // Add immediate background to prevent world map flash
        const immediateBackground = L.rectangle([
            [85, -180], [-85, 180]  // Cover entire world
        ], {
            color: 'transparent',
            fillColor: '#f8f9fa',
            fillOpacity: 1,
            stroke: false,
            interactive: false
        });
        immediateBackground.addTo(this.indiaMaskLayer);
        this.indiaMaskLayer.addTo(this.map);
        
        // Set initial base layer (satellite) with India bounds restriction
        this.changeMapStyle('satellite');
        
        // Add scale control
        L.control.scale({
            position: 'bottomleft'
        }).addTo(this.map);
        
        // Fit map to India bounds initially
        this.map.fitBounds(indiaBounds, {
            padding: [10, 10] // Add some padding
        });
        
        console.log('✅ Map initialized successfully with India-only bounds and masking');
    }
    
    setupEventListeners() {
        // Layer toggle controls
        document.getElementById('toggle-states').addEventListener('change', (e) => {
            this.toggleLayer('states', e.target.checked);
        });
        
        document.getElementById('toggle-districts').addEventListener('change', (e) => {
            this.toggleLayer('districts', e.target.checked);
        });
        
        // Sites toggle
        document.getElementById('toggle-sites').addEventListener('change', (e) => {
            this.toggleLayer('sites', e.target.checked);
        });
        
        // Instruments toggle
        document.getElementById('toggle-instruments').addEventListener('change', (e) => {
            this.toggleLayer('instruments', e.target.checked);
        });
        
        // Map style selector
        document.getElementById('map-style-selector').addEventListener('change', (e) => {
            this.changeMapStyle(e.target.value);
        });
        
        // Reset view button
        document.getElementById('reset-view-btn').addEventListener('click', () => {
            this.resetMapView();
        });
        
        console.log('✅ Event listeners set up');
    }
    
    async loadGeoJSONLayers() {
        try {
            console.log('📡 Loading GeoJSON data...');
            
            // Load states data first for precise masking
            const statesResponse = await fetch('/api/geojson/IND_WHOLE');
            if (!statesResponse.ok) {
                throw new Error(`Failed to load states data: ${statesResponse.statusText}`);
            }
            const statesData = await statesResponse.json();
            this.stateCount = statesData.features.length;
            document.getElementById('state-count').textContent = this.stateCount;
            
            // Update mask with precise India boundaries
            this.updateIndiaMaskWithPreciseBoundaries(statesData);
            
            // Load districts data
            const districtsResponse = await fetch('/api/geojson/IND_adm2');
            if (!districtsResponse.ok) {
                throw new Error(`Failed to load districts data: ${districtsResponse.statusText}`);
            }
            const districtsData = await districtsResponse.json();
            this.districtCount = districtsData.features.length;
            document.getElementById('district-count').textContent = this.districtCount;
            
            // Create state layer
            this.createStateLayer(statesData);
            
            // Create district layer
            this.createDistrictLayer(districtsData);
            
            // Add initial layers
            if (document.getElementById('toggle-states').checked) {
                this.stateLayer.addTo(this.map);
            }
            if (document.getElementById('toggle-districts').checked) {
                this.districtLayer.addTo(this.map);
            }
            
            // Ensure map stays within India bounds
            const indiaBounds = L.latLngBounds([6.754, 68.186], [37.042, 97.415]);
            this.map.fitBounds(indiaBounds, {
                padding: [20, 20] // Add padding for better view
            });
            
            console.log(`✅ Loaded ${this.stateCount} states and ${this.districtCount} districts`);
            console.log('✅ Map view restricted to India boundaries with precise masking');
            
        } catch (error) {
            console.error('❌ Error loading GeoJSON data:', error);
            throw error;
        }
    }
    
    async loadProjectData() {
        try {
            console.log('📡 Loading project data from Laravel API...');
            
            const response = await fetch('/api/projects');
            if (!response.ok) {
                throw new Error(`Failed to load project data: ${response.statusText}`);
            }
            
            const projectData = await response.json();
            console.log('📊 Received project data:', projectData);
            
            // The API returns a direct array of projects, not wrapped in a projects property
            const projects = Array.isArray(projectData) ? projectData : projectData.projects || [];
            
            // Count projects, sites, and instruments
            this.projectCount = projects.length;
            this.siteCount = 0;
            this.instrumentCount = 0;
            
            if (projects && projects.length > 0) {
                console.log(`🔍 Processing ${projects.length} projects...`);
                projects.forEach((project, index) => {
                    console.log(`Project ${index + 1}: ${project.name} with ${project.sites ? project.sites.length : 0} sites`);
                    if (project.sites) {
                        project.sites.forEach((site, siteIndex) => {
                            console.log(`  Site ${siteIndex + 1}: ${site.site_name} at [${site.latitude}, ${site.longitude}]`);
                            
                            // Count instruments for each site
                            if (site.instrument_assignments && site.instrument_assignments.length > 0) {
                                this.instrumentCount += site.instrument_assignments.length;
                            }
                        });
                        this.siteCount += project.sites.length;
                    }
                });
            } else {
                console.warn('⚠️ No projects found in API response');
            }
            
            // Update counts in UI
            if (document.getElementById('project-count')) {
                document.getElementById('project-count').textContent = this.projectCount;
            }
            if (document.getElementById('site-count')) {
                document.getElementById('site-count').textContent = this.siteCount;
            }
            if (document.getElementById('instrument-count')) {
                document.getElementById('instrument-count').textContent = this.instrumentCount;
            }
            
            // Create separate layers for sites and instruments
            this.createSitesLayer(projects || []);
            this.createInstrumentsLayer(projects || []);
            
            console.log(`✅ Loaded ${this.projectCount} projects with ${this.siteCount} sites and ${this.instrumentCount} instruments`);
            
        } catch (error) {
            console.error('❌ Error loading project data:', error);
            console.error('Error details:', error.stack);
            // Don't throw error - map should still work without project data
            console.warn('⚠️ Map will continue without project markers');
        }
    }
    
    createSitesLayer(projects) {
        this.sitesLayer = L.layerGroup();
        let siteMarkerCount = 0;
        
        console.log(`� Creating site markers for ${projects.length} projects...`);
        
        projects.forEach((project, projectIndex) => {
            if (project.sites && project.sites.length > 0) {
                console.log(`📍 Processing ${project.sites.length} sites for project: ${project.name}`);
                project.sites.forEach((site, siteIndex) => {
                    if (site.latitude && site.longitude) {
                        console.log(`  Creating site marker: ${site.site_name} at [${site.latitude}, ${site.longitude}]`);
                        const marker = this.createSiteMarker(site, project);
                        if (marker) {
                            marker.addTo(this.sitesLayer);
                            siteMarkerCount++;
                        }
                    } else {
                        console.warn(`  ⚠️ Site ${site.site_name} missing coordinates: lat=${site.latitude}, lng=${site.longitude}`);
                    }
                });
            }
        });
        
        console.log(`✅ Created ${siteMarkerCount} site markers`);
        
        // Add to map if sites toggle is checked
        const sitesToggle = document.getElementById('toggle-sites');
        if (sitesToggle && sitesToggle.checked) {
            console.log('🏢 Adding site markers to map');
            this.sitesLayer.addTo(this.map);
        }
    }
    
    createInstrumentsLayer(projects) {
        this.instrumentsLayer = L.layerGroup();
        let instrumentMarkerCount = 0;
        
        console.log(`🔬 Creating instrument markers for ${projects.length} projects...`);
        
        projects.forEach((project) => {
            if (project.sites && project.sites.length > 0) {
                project.sites.forEach((site) => {
                    if (site.instrument_assignments && site.instrument_assignments.length > 0) {
                        site.instrument_assignments.forEach((assignment, index) => {
                            if (site.latitude && site.longitude) {
                                console.log(`  Creating instrument marker for ${assignment.instrument_name || `Instrument ${index + 1}`} at site: ${site.site_name}`);
                                const marker = this.createInstrumentMarker(assignment, site, project, index);
                                if (marker) {
                                    marker.addTo(this.instrumentsLayer);
                                    instrumentMarkerCount++;
                                }
                            }
                        });
                    }
                });
            }
        });
        
        console.log(`✅ Created ${instrumentMarkerCount} instrument markers`);
        
        // Add to map if instruments toggle is checked
        const instrumentsToggle = document.getElementById('toggle-instruments');
        if (instrumentsToggle && instrumentsToggle.checked) {
            console.log('🔬 Adding instrument markers to map');
            this.instrumentsLayer.addTo(this.map);
        }
    }
    
    createSiteMarker(site, project) {
        const lat = parseFloat(site.latitude);
        const lng = parseFloat(site.longitude);
        
        console.log(`🎨 Creating marker for ${site.site_name} at [${lat}, ${lng}]`);
        console.log(`🖼️ Site icon URL:`, site.icon || 'NO ICON URL');
        
        // Validate coordinates
        if (isNaN(lat) || isNaN(lng)) {
            console.error(`❌ Invalid coordinates for ${site.site_name}: lat=${lat}, lng=${lng}`);
            return null;
        }
        
        // Create custom pin-style icon using site icon URL if available, otherwise default pin
        let iconHtml = '';
        if (site.icon && (site.icon.startsWith('http') || site.icon.startsWith('/storage'))) {
            console.log(`✅ Using icon URL for ${site.site_name}: ${site.icon}`);
            iconHtml = `
                <div style="position: relative; width: 40px; height: 50px;">
                    <div style="
                        position: absolute;
                        bottom: 0;
                        left: 50%;
                        transform: translateX(-50%);
                        width: 0;
                        height: 0;
                        border-left: 8px solid transparent;
                        border-right: 8px solid transparent;
                        border-top: 12px solid #007cba;
                    "></div>
                    <div style="
                        position: absolute;
                        top: 0;
                        left: 50%;
                        transform: translateX(-50%);
                        width: 32px;
                        height: 32px;
                        border-radius: 50%;
                        overflow: hidden;
                        border: 3px solid #007cba;
                        background: white;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    ">
                        <img src="${site.icon}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'; this.parentElement.innerHTML='📍'; this.parentElement.style.display='flex'; this.parentElement.style.alignItems='center'; this.parentElement.style.justifyContent='center'; this.parentElement.style.fontSize='16px';" />
                    </div>
                </div>
            `;
        } else {
            console.log(`📍 Using default pin icon for ${site.site_name}`);
            iconHtml = `
                <div style="position: relative; width: 40px; height: 50px;">
                    <div style="
                        position: absolute;
                        bottom: 0;
                        left: 50%;
                        transform: translateX(-50%);
                        width: 0;
                        height: 0;
                        border-left: 8px solid transparent;
                        border-right: 8px solid transparent;
                        border-top: 12px solid #dc3545;
                    "></div>
                    <div style="
                        position: absolute;
                        top: 0;
                        left: 50%;
                        transform: translateX(-50%);
                        width: 32px;
                        height: 32px;
                        border-radius: 50%;
                        background: #dc3545;
                        border: 3px solid white;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-size: 16px;
                        font-weight: bold;
                    ">
                        📍
                    </div>
                </div>
            `;
        }
        
        const customIcon = L.divIcon({
            html: iconHtml,
            className: 'custom-site-marker',
            iconSize: [40, 50],
            iconAnchor: [20, 50]
        });
        
        const marker = L.marker([lat, lng], { icon: customIcon });
        
        // Add click handler to show modal (popup/tooltip disabled)
        marker.on('click', () => {
            console.log(`🖱️ Clicked marker for ${site.site_name}`);
            this.showSiteModal(site, project);
        });
        
        console.log(`✅ Created marker for ${site.site_name}`);
        return marker;
    }
    
    
    createInstrumentMarker(assignment, site, project, index) {
        const lat = parseFloat(site.latitude);
        const lng = parseFloat(site.longitude);
        
        console.log(`🔬 Creating instrument marker for assignment at ${site.site_name}`);
        
        // Validate coordinates
        if (isNaN(lat) || isNaN(lng)) {
            console.error(`❌ Invalid coordinates for instrument at ${site.site_name}: lat=${lat}, lng=${lng}`);
            return null;
        }
        
        // Offset instrument markers slightly to avoid overlap with site markers
        const offsetLat = lat + (index * 0.001);
        const offsetLng = lng + (index * 0.001);
        
        console.log(`🎯 Instrument marker position (offset): [${offsetLat}, ${offsetLng}]`);
        
        // Create custom pin-style icon for instrument
        const iconHtml = `
            <div style="position: relative; width: 35px; height: 45px;">
                <div style="
                    position: absolute;
                    bottom: 0;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 0;
                    height: 0;
                    border-left: 7px solid transparent;
                    border-right: 7px solid transparent;
                    border-top: 10px solid #28a745;
                "></div>
                <div style="
                    position: absolute;
                    top: 0;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    background: #28a745;
                    border: 3px solid white;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 14px;
                    font-weight: bold;
                ">
                    🔬
                </div>
            </div>
        `;
        
        const instrumentIcon = L.divIcon({
            html: iconHtml,
            className: 'custom-instrument-marker',
            iconSize: [35, 45],
            iconAnchor: [17, 45]
        });
        
        const marker = L.marker([offsetLat, offsetLng], { icon: instrumentIcon });
        
        // Add click handler to show modal (popup/tooltip disabled)
        marker.on('click', () => {
            console.log(`🖱️ Clicked instrument marker at ${site.site_name}`);
            this.showInstrumentModal(assignment, site, project);
        });
        
        console.log(`✅ Created instrument marker`);
        return marker;
    }
    
    
    showSiteModal(site, project) {
        // Create modal if it doesn't exist
        let modal = document.getElementById('site-modal');
        if (!modal) {
            modal = this.createSiteModal();
        }
        
        // Populate modal content
        document.getElementById('modal-site-name').textContent = site.site_name;
        document.getElementById('modal-project-name').textContent = project.name;
        document.getElementById('modal-site-location').textContent = site.place || 'Not specified';
        document.getElementById('modal-site-coordinates').textContent = `${site.latitude}, ${site.longitude}`;
        document.getElementById('modal-project-description').textContent = project.description || 'No description available';
        
        // Set banner image if available
        const bannerImg = document.getElementById('modal-site-banner');
        if (site.banner && site.banner !== 'null') {
            bannerImg.src = site.banner;
            bannerImg.style.display = 'block';
        } else {
            bannerImg.style.display = 'none';
        }
        
        // Set gallery images if available
        const galleryContainer = document.getElementById('modal-site-gallery');
        if (site.gallery && Array.isArray(site.gallery) && site.gallery.length > 0) {
            // Handle array format from updated API
            console.log(`📸 Processing ${site.gallery.length} gallery images for ${site.site_name}`);
            galleryContainer.innerHTML = site.gallery.map(img => 
                `<img src="${img}" class="gallery-thumb" onclick="window.open('${img}', '_blank')" />`
            ).join('');
            galleryContainer.style.display = site.gallery.length > 0 ? 'flex' : 'none';
        } else if (site.gallery && typeof site.gallery === 'string' && site.gallery !== 'null') {
            // Handle legacy space-separated string format (fallback)
            console.log(`📸 Processing legacy gallery string for ${site.site_name}`);
            const images = site.gallery.split(' ').filter(img => img.trim() !== '');
            galleryContainer.innerHTML = images.map(img => 
                `<img src="${img.trim()}" class="gallery-thumb" onclick="window.open('${img.trim()}', '_blank')" />`
            ).join('');
            galleryContainer.style.display = images.length > 0 ? 'flex' : 'none';
        } else {
            console.log(`📸 No gallery images for ${site.site_name}`);
            galleryContainer.innerHTML = '';
            galleryContainer.style.display = 'none';
        }
        
        // Show modal
        modal.style.display = 'flex';
    }
    
    showInstrumentModal(assignment, site, project) {
        // Create modal if it doesn't exist
        let modal = document.getElementById('instrument-modal');
        if (!modal) {
            modal = this.createInstrumentModal();
        }
        
        // Populate modal content
        document.getElementById('modal-instrument-name').textContent = assignment.instrument_name || 'Instrument';
        document.getElementById('modal-instrument-site').textContent = site.site_name;
        document.getElementById('modal-instrument-project').textContent = project.name;
        document.getElementById('modal-instrument-id').textContent = assignment.id || 'N/A';
        document.getElementById('modal-instrument-status').textContent = assignment.status || 'Unknown';
        document.getElementById('modal-instrument-coordinates').textContent = `${site.latitude}, ${site.longitude}`;
        document.getElementById('modal-instrument-location').textContent = site.place || 'Not specified';
        
        // Show modal
        modal.style.display = 'flex';
    }
    
    createSiteModal() {
        const modalHtml = `
            <div id="site-modal" class="modal" style="display: none;">
                <div class="modal-content modal-lg">
                    <div class="modal-header">
                        <h4 class="modal-title" id="modal-site-name">Site Details</h4>
                        <button type="button" class="close-btn" onclick="document.getElementById('site-modal').style.display='none'">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="site-details">
                            <img id="modal-site-banner" class="site-banner" style="display: none;" />
                            
                            <div class="detail-group">
                                <h5>Site Information</h5>
                                <div class="detail-item">
                                    <strong>Project:</strong> <span id="modal-project-name"></span>
                                </div>
                                <div class="detail-item">
                                    <strong>Location:</strong> <span id="modal-site-location"></span>
                                </div>
                                <div class="detail-item">
                                    <strong>Coordinates:</strong> <span id="modal-site-coordinates"></span>
                                </div>
                            </div>
                            
                            <div class="detail-group">
                                <h5>Project Description</h5>
                                <p id="modal-project-description"></p>
                            </div>
                            
                            <div class="detail-group">
                                <h5>Gallery</h5>
                                <div id="modal-site-gallery" class="site-gallery"></div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('site-modal').style.display='none'">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        return document.getElementById('site-modal');
    }
    
    createInstrumentModal() {
        const modalHtml = `
            <div id="instrument-modal" class="modal" style="display: none;">
                <div class="modal-content modal-md">
                    <div class="modal-header">
                        <h4 class="modal-title" id="modal-instrument-name">Instrument Details</h4>
                        <button type="button" class="close-btn" onclick="document.getElementById('instrument-modal').style.display='none'">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="instrument-details">
                            <div class="detail-group">
                                <h5>Instrument Information</h5>
                                <div class="detail-item">
                                    <strong>Assignment ID:</strong> <span id="modal-instrument-id"></span>
                                </div>
                                <div class="detail-item">
                                    <strong>Status:</strong> <span id="modal-instrument-status"></span>
                                </div>
                            </div>
                            
                            <div class="detail-group">
                                <h5>Location Information</h5>
                                <div class="detail-item">
                                    <strong>Site:</strong> <span id="modal-instrument-site"></span>
                                </div>
                                <div class="detail-item">
                                    <strong>Project:</strong> <span id="modal-instrument-project"></span>
                                </div>
                                <div class="detail-item">
                                    <strong>Location:</strong> <span id="modal-instrument-location"></span>
                                </div>
                                <div class="detail-item">
                                    <strong>Coordinates:</strong> <span id="modal-instrument-coordinates"></span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('instrument-modal').style.display='none'">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        return document.getElementById('instrument-modal');
    }
    
    createStateLayer(statesData) {
        this.stateLayer = L.geoJSON(statesData, {
            style: {
                fillColor: '#ff7800',
                weight: 2,
                opacity: 1,
                color: '#ffffff',
                dashArray: '3',
                fillOpacity: 0.3
            },
            onEachFeature: (feature, layer) => {
                this.addStateFeatureEvents(feature, layer);
            }
        });
        
        console.log('✅ State layer created');
    }
    
    createDistrictLayer(districtsData) {
        this.districtLayer = L.geoJSON(districtsData, {
            style: {
                fillColor: '#00ff00',
                weight: 1,
                opacity: 1,
                color: '#ffffff',
                fillOpacity: 0.2
            },
            onEachFeature: (feature, layer) => {
                this.addDistrictFeatureEvents(feature, layer);
            }
        });
        
        console.log('✅ District layer created');
    }
    
    addStateFeatureEvents(feature, layer) {
        const props = feature.properties;
        const popupContent = `
            <div class="popup-content">
                <div class="popup-header">${props.NAME_1 || 'Unknown State'}</div>
                <div class="popup-item"><strong>Type:</strong> ${props.ENGTYPE_1 || 'State/UT'}</div>
                <div class="popup-item"><strong>Country:</strong> ${props.NAME_0 || 'India'}</div>
                ${props.ISO ? `<div class="popup-item"><strong>ISO Code:</strong> ${props.ISO}</div>` : ''}
            </div>
        `;
        
        layer.bindPopup(popupContent, {
            maxWidth: 300,
            className: 'custom-popup'
        });
        
        layer.on({
            mouseover: (e) => {
                e.target.setStyle({
                    weight: 3,
                    color: '#666',
                    dashArray: '',
                    fillOpacity: 0.5
                });
            },
            mouseout: (e) => {
                this.stateLayer.resetStyle(e.target);
            },
            click: (e) => {
                this.selectFeature({
                    name: props.NAME_1 || 'Unknown State',
                    type: props.ENGTYPE_1 || 'State/UT',
                    parent: null,
                    iso: props.ISO || 'N/A'
                });
                this.map.fitBounds(e.target.getBounds());
            }
        });
    }
    
    addDistrictFeatureEvents(feature, layer) {
        const props = feature.properties;
        const popupContent = `
            <div class="popup-content">
                <div class="popup-header">${props.NAME_2 || 'Unknown District'}</div>
                <div class="popup-item"><strong>State:</strong> ${props.NAME_1 || 'Unknown'}</div>
                <div class="popup-item"><strong>Type:</strong> ${props.ENGTYPE_2 || 'District'}</div>
                <div class="popup-item"><strong>Country:</strong> ${props.NAME_0 || 'India'}</div>
            </div>
        `;
        
        layer.bindPopup(popupContent, {
            maxWidth: 300,
            className: 'custom-popup'
        });
        
        layer.on({
            mouseover: (e) => {
                e.target.setStyle({
                    weight: 2,
                    color: '#666',
                    fillOpacity: 0.4
                });
            },
            mouseout: (e) => {
                this.districtLayer.resetStyle(e.target);
            },
            click: (e) => {
                this.selectFeature({
                    name: props.NAME_2 || 'Unknown District',
                    type: props.ENGTYPE_2 || 'District',
                    parent: props.NAME_1 || 'Unknown',
                    iso: props.NAME_0 || 'India'
                });
                this.map.fitBounds(e.target.getBounds());
            }
        });
    }
    
    toggleLayer(layerName, isVisible) {
        console.log(`🎛️ Toggling ${layerName} layer: ${isVisible ? 'ON' : 'OFF'}`);
        
        if (layerName === 'states' && this.stateLayer) {
            if (isVisible) {
                this.stateLayer.addTo(this.map);
                console.log('✅ States layer added to map');
            } else {
                this.map.removeLayer(this.stateLayer);
                console.log('🚫 States layer removed from map');
            }
        } else if (layerName === 'districts' && this.districtLayer) {
            if (isVisible) {
                this.districtLayer.addTo(this.map);
                console.log('✅ Districts layer added to map');
            } else {
                this.map.removeLayer(this.districtLayer);
                console.log('🚫 Districts layer removed from map');
            }
        } else if (layerName === 'sites' && this.sitesLayer) {
            if (isVisible) {
                this.sitesLayer.addTo(this.map);
                console.log('✅ Sites layer added to map');
            } else {
                this.map.removeLayer(this.sitesLayer);
                console.log('🚫 Sites layer removed from map');
            }
        } else if (layerName === 'instruments' && this.instrumentsLayer) {
            if (isVisible) {
                this.instrumentsLayer.addTo(this.map);
                console.log('✅ Instruments layer added to map');
            } else {
                this.map.removeLayer(this.instrumentsLayer);
                console.log('🚫 Instruments layer removed from map');
            }
        } else {
            console.warn(`⚠️ Layer '${layerName}' not found or not initialized`);
        }
        
        this.updateStatistics();
        console.log(`${layerName} layer ${isVisible ? 'shown' : 'hidden'}`);
    }
    
    changeMapStyle(styleKey) {
        const style = this.mapStyles[styleKey];
        
        if (!style) {
            console.error('Invalid map style:', styleKey);
            return;
        }
        
        if (this.currentBaseLayer) {
            this.map.removeLayer(this.currentBaseLayer);
        }
        
        this.currentBaseLayer = L.tileLayer(style.url, {
            attribution: style.attribution,
            maxZoom: 18,
            minZoom: 3,
            tileSize: 256,
            zoomOffset: 0,
            bounds: style.bounds // Restrict tile loading to India region
        });
        
        this.currentBaseLayer.addTo(this.map);
        console.log(`Map style changed to: ${style.name}`);
    }
    
    updateIndiaMaskWithPreciseBoundaries(indiaData) {
        // Clear existing mask content but keep the layer
        this.indiaMaskLayer.clearLayers();
        
        // Create precise world polygon with India holes
        const worldBounds = [
            [85, -180], [85, 180], [-85, 180], [-85, -180], [85, -180]
        ];
        
        // Extract precise India holes
        const indiaHoles = [];
        indiaData.features.forEach(feature => {
            if (feature.geometry && feature.geometry.coordinates) {
                if (feature.geometry.type === 'Polygon') {
                    // For polygon, add the outer ring as a hole
                    const coords = feature.geometry.coordinates[0].map(coord => [coord[1], coord[0]]); // Swap lat/lng
                    indiaHoles.push(coords);
                } else if (feature.geometry.type === 'MultiPolygon') {
                    // For multi-polygon, add each polygon's outer ring as holes
                    feature.geometry.coordinates.forEach(polygon => {
                        const coords = polygon[0].map(coord => [coord[1], coord[0]]); // Swap lat/lng
                        indiaHoles.push(coords);
                    });
                }
            }
        });
        
        // Create updated mask polygon with precise India holes
        const preciseMask = L.polygon([worldBounds, ...indiaHoles], {
            color: 'transparent',
            fillColor: '#f8f9fa',
            fillOpacity: 1,
            stroke: false,
            interactive: false
        });
        
        preciseMask.addTo(this.indiaMaskLayer);
        console.log(`✅ India mask updated with ${indiaHoles.length} precise boundary holes`);
    }
    
    selectFeature(feature) {
        this.selectedFeature = feature;
        this.showFeatureInfo(feature);
    }
    
    showFeatureInfo(feature) {
        const infoPanel = document.getElementById('info-panel');
        const infoContent = document.getElementById('info-content');
        
        infoContent.innerHTML = `
            <div class="info-item"><strong>Name:</strong> ${feature.name}</div>
            <div class="info-item"><strong>Type:</strong> ${feature.type}</div>
            ${feature.parent ? `<div class="info-item"><strong>State:</strong> ${feature.parent}</div>` : ''}
            <div class="info-item"><strong>ISO:</strong> ${feature.iso}</div>
        `;
        
        infoPanel.style.display = 'block';
    }
    
    updateStatistics() {
        const visibleLayers = 
            (document.getElementById('toggle-states').checked ? 1 : 0) +
            (document.getElementById('toggle-districts').checked ? 1 : 0) +
            (document.getElementById('toggle-projects') && document.getElementById('toggle-projects').checked ? 1 : 0);
        
        const totalFeatures = this.stateCount + this.districtCount;
        
        document.getElementById('total-features').textContent = totalFeatures;
        document.getElementById('visible-layers').textContent = visibleLayers;
    }
    
    resetMapView() {
        // Reset view to India bounds with proper centering
        const indiaBounds = L.latLngBounds([6.754, 68.186], [37.042, 97.415]);
        this.map.fitBounds(indiaBounds, {
            padding: [20, 20],
            maxZoom: 5 // Ensure we don't zoom too close
        });
        console.log('🔄 Map view reset to India boundaries with masking');
    }
    
    showLoading() {
        document.getElementById('loading-indicator').style.display = 'flex';
    }
    
    hideLoading() {
        document.getElementById('loading-indicator').style.display = 'none';
    }
    
    showError(message) {
        document.getElementById('error-message').textContent = message;
        document.getElementById('error-modal').style.display = 'flex';
        this.hideLoading();
    }
}

// Global functions for modal control
function closeErrorModal() {
    document.getElementById('error-modal').style.display = 'none';
}

// Initialize the map when the page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🗺️ Initializing India Interactive Map...');
    window.indiaMap = new IndiaInteractiveMap();
    
    // Add some helpful console information
    console.log('='.repeat(50));
    console.log('🇮🇳 India Interactive Map - Python Web Application');
    console.log('='.repeat(50));
    console.log('📍 Map initialized with Leaflet.js');
    console.log('🔗 API endpoints available:');
    console.log('   - /api/geojson/IND_WHOLE (States/UTs)');
    console.log('   - /api/geojson/IND_adm2 (Districts)');
    console.log('   - /api/metadata (Dataset information)');
    console.log('='.repeat(50));
});

// Export for use in other scripts (future instrument integration)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IndiaInteractiveMap;
}
