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
        this.stateCount = 0;
        this.districtCount = 0;
        this.projectCount = 0;
        this.siteCount = 0;
        this.instrumentCount = 0; // Track instrument count
        this.indiaMaskLayer = null;
        
        // Cache for API responses
        this.cache = {
            states: null,
            districts: null,
            projects: null,
            timestamp: null
        };
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes cache
        
        this.mapStyles = {
            onlyshape: {
                name: 'Only Shape',
                url: null, // No background tiles
                attribution: '',
                bounds: L.latLngBounds([5.0, 67.0], [39.0, 99.0]) // Restrict to India region
            },
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
            this.showLoading();
            
            // Initialize map first for instant display
            this.initializeMap();
            this.setupEventListeners();
            
            // Hide loading after basic map is ready
            this.hideLoading();
            
            // Load data in background without blocking UI
            this.loadDataInBackground();
            
        } catch (error) {
            console.error('❌ Error initializing map:', error);
            this.showError('Failed to initialize map: ' + error.message);
            this.hideLoading();
        }
    }
    
    async loadDataInBackground() {
        try {
            // Show center loading screen for data loading
            this.showLoading();
            
            // Load GeoJSON layers and project data in parallel for faster loading
            const [geoJsonResult, projectResult] = await Promise.allSettled([
                this.loadGeoJSONLayers(),
                this.loadProjectData()
            ]);
            
            // Check if any critical loads failed
            if (geoJsonResult.status === 'rejected') {
                console.warn('⚠️ GeoJSON layers failed to load:', geoJsonResult.reason);
            }
            if (projectResult.status === 'rejected') {
                console.warn('⚠️ Project data failed to load:', projectResult.reason);
            }
            
            this.hideLoading();
            this.updateStatistics();
            
        } catch (error) {
            console.error('❌ Error loading map data:', error);
            this.hideLoading();
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
        
        // Set initial base layer (Only Shape) with India bounds restriction
        this.changeMapStyle('onlyshape');
        
        // Add scale control
        L.control.scale({
            position: 'bottomleft'
        }).addTo(this.map);
        
        // Fit map to India bounds initially
        this.map.fitBounds(indiaBounds, {
            padding: [10, 10] // Add some padding
        });
        
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
        
    }
    
    async loadGeoJSONLayers() {
        try {
            // Check cache first
            if (this.isCacheValid() && this.cache.states && this.cache.districts) {
                console.log('📦 Using cached GeoJSON data');
                this.processStatesData(this.cache.states);
                this.processDistrictsData(this.cache.districts);
                return;
            }
            
            // Load states data first for precise masking
            const statesResponse = await fetch('/api/geojson/IND_WHOLE');
            if (!statesResponse.ok) {
                throw new Error(`Failed to load states data: ${statesResponse.statusText}`);
            }
            const statesData = await statesResponse.json();
            
            // Cache states data
            this.cache.states = statesData;
            this.processStatesData(statesData);
            
            // Load districts data conditionally (only if districts toggle is checked)
            const districtsToggle = document.getElementById('toggle-districts');
            if (districtsToggle && districtsToggle.checked) {
                await this.loadDistrictsLayer();
            }
            
            // Update cache timestamp
            this.cache.timestamp = Date.now();
            
        } catch (error) {
            console.error('❌ Error loading GeoJSON data:', error);
            throw error;
        }
    }
    
    async loadDistrictsLayer() {
        // Check cache first
        if (this.cache.districts) {
            this.processDistrictsData(this.cache.districts);
            return;
        }
        
        const districtsResponse = await fetch('/api/geojson/IND_adm2');
        if (!districtsResponse.ok) {
            throw new Error(`Failed to load districts data: ${districtsResponse.statusText}`);
        }
        const districtsData = await districtsResponse.json();
        
        // Cache districts data
        this.cache.districts = districtsData;
        this.processDistrictsData(districtsData);
    }
    
    processStatesData(statesData) {
        this.stateCount = statesData.features.length;
        document.getElementById('state-count').textContent = this.stateCount;
        
        // Update mask with precise India boundaries
        this.updateIndiaMaskWithPreciseBoundaries(statesData);
        
        // Create state layer
        this.createStateLayer(statesData);
        
        // Add initial layers
        if (document.getElementById('toggle-states').checked) {
            this.stateLayer.addTo(this.map);
        }
    }
    
    processDistrictsData(districtsData) {
        this.districtCount = districtsData.features.length;
        document.getElementById('district-count').textContent = this.districtCount;
        
        // Create district layer
        this.createDistrictLayer(districtsData);
        
        if (document.getElementById('toggle-districts').checked) {
            this.districtLayer.addTo(this.map);
        }
        
        // Ensure map stays within India bounds
        const indiaBounds = L.latLngBounds([6.754, 68.186], [37.042, 97.415]);
        this.map.fitBounds(indiaBounds, {
            padding: [5, 5] // Reduced padding to prevent zoom out
        });
    }
    
    isCacheValid() {
        return this.cache.timestamp && (Date.now() - this.cache.timestamp) < this.cacheExpiry;
    }
    
    async loadProjectData() {
        let projectData;
        let dataSource = 'unknown';
        
        // Check cache first
        if (this.isCacheValid() && this.cache.projects) {
            console.log('📦 Using cached project data');
            this.processProjectData(this.cache.projects);
            return;
        }
        
        try {
            console.log('🔄 Attempting to load project data from API...');
            const response = await fetch('/api/projects');
            if (!response.ok) {
                throw new Error(`API failed: ${response.statusText}`);
            }
            
            projectData = await response.json();
            dataSource = 'api-live';
            console.log('✅ Successfully loaded project data from API');
            
        } catch (error) {
            console.warn('⚠️ API failed, falling back to demo_projects.json:', error.message);
            
            try {
                // Fallback to demo_projects.json via dedicated endpoint
                const fallbackResponse = await fetch('/api/demo-projects');
                if (!fallbackResponse.ok) {
                    throw new Error(`Fallback endpoint failed: ${fallbackResponse.statusText}`);
                }
                
                projectData = await fallbackResponse.json();
                dataSource = 'fallback';
                console.log('✅ Successfully loaded project data from demo_projects.json fallback');
                
            } catch (fallbackError) {
                console.error('❌ Both API and fallback failed:', fallbackError);
                dataSource = 'error';
                throw new Error(`Failed to load project data from both API and fallback endpoint`);
            }
        }
        
        // Cache project data
        this.cache.projects = { data: projectData, source: dataSource };
        this.cache.timestamp = Date.now();
        
        this.processProjectData({ data: projectData, source: dataSource });
    }
    
    processProjectData(cachedData) {
        const projectData = cachedData.data;
        const dataSource = cachedData.source;
        
        // Update data source indicator
        this.updateDataSourceIndicator(dataSource);
        
        try {
            
            // Handle Laravel API format vs demo data format
            if (Array.isArray(projectData) && projectData[0] && projectData[0].sites) {
                // Laravel API format: Array of projects with sites containing instrument_assignments
                
                // Extract all sites and instruments from all projects
                let allSites = [];
                let allInstruments = [];
                
                projectData.forEach(project => {
                    if (project.sites) {
                        project.sites.forEach(site => {
                            // Add project reference to site
                            site.project = project;
                            allSites.push(site);
                            
                            // Extract instruments from site.instrument_assignments
                            if (site.instrument_assignments && site.instrument_assignments.length > 0) {
                                site.instrument_assignments.forEach(assignment => {
                                    // Add site and project references to assignment
                                    assignment.site = site;
                                    assignment.project = project;
                                    allInstruments.push(assignment);
                                });
                            }
                        });
                    }
                });
                
                this.siteCount = allSites.length;
                this.instrumentCount = allInstruments.length;
                this.projectCount = projectData.length;
                
                
                // Create separate layers for sites and instruments
                this.createSitesLayerFromLaravelData(allSites);
                this.createInstrumentsLayerFromLaravelData(allInstruments);
                
            } else if (projectData.sites && projectData.instruments) {
                // Laravel API format: {sites: [...], instruments: [...]} (alternative format)
                
                this.siteCount = projectData.sites.length;
                this.instrumentCount = projectData.instruments.length;
                this.projectCount = new Set(projectData.sites.map(site => site.project?.id).filter(id => id)).size;
                
                // Convert Laravel format to demo format for consistency
                const convertedProjects = this.convertLaravelDataToProjectFormat(projectData);
                
                
                // Create separate layers for sites and instruments
                this.createSitesLayerFromLaravelData(projectData.sites);
                this.createInstrumentsLayerFromLaravelData(projectData.instruments);
                
            } else if (Array.isArray(projectData)) {
                // Demo data format: array of projects with nested sites and instruments
                const projects = projectData;
                
                // Count projects, sites, and instruments
                this.projectCount = projects.length;
                this.siteCount = 0;
                this.instrumentCount = 0;
                
                if (projects && projects.length > 0) {
                    // Process all data in one loop
                    projects.forEach((project) => {
                        if (project.sites) {
                            this.siteCount += project.sites.length;
                            
                            // Count instruments efficiently
                            project.sites.forEach((site) => {
                                if (site.instrument_assignments && site.instrument_assignments.length > 0) {
                                    this.instrumentCount += site.instrument_assignments.length;
                                }
                            });
                        }
                    });
                    
                }
                
                // Create separate layers for sites and instruments (demo format)
                this.createSitesLayer(projects || []);
                this.createInstrumentsLayer(projects || []);
            } else {
                console.warn('⚠️ Unknown data format received');
                this.projectCount = 0;
                this.siteCount = 0;
                this.instrumentCount = 0;
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
            
            
        } catch (error) {
            console.error('❌ Error processing project data:', error);
            console.error('Error details:', error.stack);
            
            // Reset counts to zero if data loading completely fails
            this.projectCount = 0;
            this.siteCount = 0;
            this.instrumentCount = 0;
            
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
            
            // Don't throw error - map should still work without project data
            console.warn('⚠️ Map will continue without project markers');
            
            // Update data source indicator for error state
            this.updateDataSourceIndicator('error');
        }
    }
    
    updateDataSourceIndicator(source) {
        const indicator = document.getElementById('data-source-status');
        const textElement = document.getElementById('data-source-text');
        
        if (!indicator || !textElement) {
            return; // Elements not found
        }
        
        // Remove previous classes
        indicator.classList.remove('api-live', 'fallback', 'error');
        
        switch (source) {
            case 'api-live':
                indicator.classList.add('api-live');
                textElement.textContent = 'Live API Data';
                break;
            case 'fallback':
                indicator.classList.add('fallback');
                textElement.textContent = 'Demo Data (Fallback)';
                break;
            case 'error':
                indicator.classList.add('error');
                textElement.textContent = 'No Data Available';
                break;
            default:
                textElement.textContent = 'Loading...';
        }
    }
    
    convertLaravelDataToProjectFormat(laravelData) {
        // Convert Laravel API format to demo format for consistency
        // This is optional but can be useful for uniform processing
        const projectMap = new Map();
        
        // Group sites by project
        laravelData.sites.forEach(site => {
            const projectId = site.project?.id || 'unknown';
            if (!projectMap.has(projectId)) {
                projectMap.set(projectId, {
                    id: projectId,
                    name: site.project?.name || 'Unknown Project',
                    description: site.project?.description || '',
                    sites: []
                });
            }
            projectMap.get(projectId).sites.push({
                id: site.id,
                site_name: site.site_name || site.name,
                place: site.place,
                latitude: site.latitude,
                longitude: site.longitude,
                banner: site.banner,
                gallery: site.gallery || [],
                icon: site.icon,
                instrument_assignments: []
            });
        });
        
        // Add instruments to their corresponding sites
        laravelData.instruments.forEach(instrument => {
            const siteId = instrument.site?.id;
            if (siteId) {
                // Find the site and add the instrument
                for (const project of projectMap.values()) {
                    const site = project.sites.find(s => s.id === siteId);
                    if (site) {
                        site.instrument_assignments.push({
                            id: instrument.id,
                            instrument_name: instrument.name || instrument.instrument?.name,
                            status: instrument.status || instrument.instrument?.status,
                            icon: instrument.icon
                        });
                        break;
                    }
                }
            }
        });
        
        return Array.from(projectMap.values());
    }
    
    createSitesLayerFromLaravelData(sites) {
        this.sitesLayer = L.layerGroup();
        let siteMarkerCount = 0;
        const markers = [];
        
        
        sites.forEach((site) => {
            if (site.latitude && site.longitude) {
                const marker = this.createSiteMarkerFromLaravelData(site);
                if (marker) {
                    markers.push(marker);
                    siteMarkerCount++;
                }
            }
        });
        
        // Add all markers at once for better performance
        markers.forEach(marker => marker.addTo(this.sitesLayer));
        
        
        // Add to map if sites toggle is checked
        const sitesToggle = document.getElementById('toggle-sites');
        if (sitesToggle && sitesToggle.checked) {
            this.sitesLayer.addTo(this.map);
        }
    }
    
    createInstrumentsLayerFromLaravelData(instruments) {
        this.instrumentsLayer = L.layerGroup();
        let instrumentMarkerCount = 0;
        const markers = [];
        
        
        instruments.forEach((instrument, index) => {
            if (instrument.latitude && instrument.longitude) {
                const marker = this.createInstrumentMarkerFromLaravelData(instrument, index);
                if (marker) {
                    markers.push(marker);
                    instrumentMarkerCount++;
                }
            }
        });
        
        // Add all markers at once for better performance
        markers.forEach(marker => marker.addTo(this.instrumentsLayer));
        
        
        // Add to map if instruments toggle is checked
        const instrumentsToggle = document.getElementById('toggle-instruments');
        if (instrumentsToggle && instrumentsToggle.checked) {
            this.instrumentsLayer.addTo(this.map);
        }
    }
    
    createSiteMarkerFromLaravelData(site) {
        const lat = parseFloat(site.latitude);
        const lng = parseFloat(site.longitude);
        
        // Validate coordinates
        if (isNaN(lat) || isNaN(lng)) {
            console.error(`❌ Invalid coordinates for ${site.site_name || site.name}: lat=${lat}, lng=${lng}`);
            return null;
        }
        
        // Create custom pin-style icon using site icon URL if available
        let iconHtml = '';
        if (site.icon && (site.icon.startsWith('http') || site.icon.startsWith('/storage'))) {
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
        
        // Add click handler to show modal
        marker.on('click', () => {
            this.showLaravelSiteModal(site);
        });
        
        return marker;
    }
    
    createInstrumentMarkerFromLaravelData(instrument, index) {
        const lat = parseFloat(instrument.latitude);
        const lng = parseFloat(instrument.longitude);
        
        // Validate coordinates
        if (isNaN(lat) || isNaN(lng)) {
            console.error(`❌ Invalid coordinates for instrument ${instrument.name}: lat=${lat}, lng=${lng}`);
            return null;
        }
        
        // Offset instrument markers slightly to avoid overlap
        const offsetLat = lat + (index * 0.001);
        const offsetLng = lng + (index * 0.001);
        
        // Get status-based color and instrument icon
        const statusColors = {
            'Maintenance': '#f59e0b',
            'Available': '#10b981', 
            'In Use': '#3b82f6',
            'Offline': '#ef4444'
        };
        const statusColor = statusColors[instrument.status || instrument.instrument?.status] || '#6b7280';
        
        // Get instrument data properly - instrument_assignments contains nested instrument object
        const instrumentData = instrument.instrument || {};
        const instrumentName = instrumentData.name || instrument.name || 'Unknown Instrument';
        const customIcon = instrumentData.icon || instrument.icon; // This should be the URL from the API
        
        
        const instrumentIcon = this.getInstrumentIcon(instrumentName, customIcon);
        
        // Create custom pin-style icon for instrument with real icon - transparent background
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
                    border-top: 10px solid ${statusColor};
                "></div>
                <div style="
                    position: absolute;
                    top: 0;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    background: transparent;
                    border: 2px solid white;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #333;
                    font-size: 16px;
                    font-weight: bold;
                ">
                    ${instrumentIcon}
                </div>
            </div>
        `;
        
        const instrumentMarkerIcon = L.divIcon({
            html: iconHtml,
            className: 'custom-instrument-marker',
            iconSize: [35, 45],
            iconAnchor: [17, 45]
        });
        
        const marker = L.marker([offsetLat, offsetLng], { icon: instrumentMarkerIcon });
        
        // Add status data attribute to the marker element for CSS styling
        marker.on('add', function() {
            const markerElement = this.getElement();
            if (markerElement) {
                markerElement.setAttribute('data-status', instrument.status || instrument.instrument?.status || 'Unknown');
                markerElement.setAttribute('data-instrument', instrumentName || 'Unknown');
            }
        });
        
        // Add click handler to show modal
        marker.on('click', () => {
            this.showLaravelInstrumentModal(instrument);
        });
        
        return marker;
    }
    
    showLaravelSiteModal(site) {
        // Create modal if it doesn't exist
        let modal = document.getElementById('site-modal');
        if (!modal) {
            modal = this.createSiteModal();
        }

        // Get site icon from API or fallback
        const apiSiteIcon = site.icon;
        let siteIcon = '📍'; // default fallback
        
        if (apiSiteIcon && (apiSiteIcon.startsWith('http') || apiSiteIcon.startsWith('/storage') || apiSiteIcon.includes('.'))) {
            // Use API image icon
            siteIcon = `<img src="${apiSiteIcon}" style="width: 24px; height: 24px; object-fit: contain; border-radius: 4px;" onerror="this.outerHTML='📍';" />`;
        }

        // Set modal title with site icon
        const modalTitle = document.getElementById('modal-site-name');
        const siteName = site.site_name || site.name || 'Unknown Site';
        modalTitle.innerHTML = `${siteIcon} ${siteName}`;

        // Update the site section header icon
        const siteHeaderIcon = document.querySelector('#site-details-section .section-icon');
        if (siteHeaderIcon) {
            siteHeaderIcon.innerHTML = siteIcon;
        }

        // Set banner image if available
        const bannerImg = document.getElementById('modal-site-banner');
        if (site.banner && site.banner !== 'null') {
            bannerImg.src = site.banner;
            bannerImg.style.display = 'block';
        } else {
            bannerImg.style.display = 'none';
        }

        // Clear previous content
        const siteDetailsGrid = document.getElementById('site-details-grid');
        const projectDetailsGrid = document.getElementById('project-details-grid');
        
        siteDetailsGrid.innerHTML = '';
        projectDetailsGrid.innerHTML = '';

        // 1. SITE DETAILS SECTION
        const latitude = parseFloat(site.latitude);
        const longitude = parseFloat(site.longitude);
        
        const siteDetailsCards = [
            {
                icon: siteIcon,
                label: 'Site Name',
                value: siteName
            },
            {
                icon: '🆔',
                label: 'Site ID',
                value: site.id || 'Not specified'
            },
            {
                icon: '📍',
                label: 'Place',
                value: site.place || 'Not specified'
            },
            {
                icon: '🗺️',
                label: 'Coordinates',
                value: `<span class="coordinates-link" onclick="window.open('https://www.google.com/maps?q=${latitude},${longitude}', '_blank')">${latitude.toFixed(4)}, ${longitude.toFixed(4)}</span>`
            },
            {
                icon: '🔬',
                label: 'Total Instruments',
                value: site.instrument_assignments ? `${site.instrument_assignments.length} instruments` : '0 instruments'
            },
            {
                icon: '🖼️',
                label: 'Gallery Images',
                value: site.gallery && site.gallery.length > 0 ? `${site.gallery.length} images` : 'No images'
            }
        ];

        if (site.description) {
            siteDetailsCards.push({
                icon: '📝',
                label: 'Site Description',
                value: site.description,
                fullWidth: true
            });
        }

        siteDetailsCards.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.className = `info-card ${card.fullWidth ? 'full-width' : ''}`;
            cardElement.innerHTML = `
                <div class="info-label">
                    <span>${card.icon}</span>
                    ${card.label}
                </div>
                <div class="info-value">${card.value}</div>
            `;
            siteDetailsGrid.appendChild(cardElement);
        });

        // Setup Google Maps link
        const googleMapsLink = document.getElementById('google-maps-site-link');
        if (!isNaN(latitude) && !isNaN(longitude)) {
            googleMapsLink.href = `https://www.google.com/maps?q=${latitude},${longitude}&z=15`;
            googleMapsLink.style.display = 'inline-flex';
        } else {
            googleMapsLink.style.display = 'none';
        }

        // 2. PROJECT INFORMATION SECTION
        const projectData = site.project || {};
        const projectDetailsCards = [
            {
                icon: '🆔',
                label: 'Project ID',
                value: projectData.id || 'Not specified'
            },
            {
                icon: '�',
                label: 'Project Name',
                value: projectData.name || 'Not specified'
            }
        ];

        if (projectData.description) {
            projectDetailsCards.push({
                icon: '📝',
                label: 'Project Description',
                value: projectData.description,
                fullWidth: true
            });
        }

        projectDetailsCards.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.className = `info-card ${card.fullWidth ? 'full-width' : ''}`;
            cardElement.innerHTML = `
                <div class="info-label">
                    <span>${card.icon}</span>
                    ${card.label}
                </div>
                <div class="info-value">${card.value}</div>
            `;
            projectDetailsGrid.appendChild(cardElement);
        });

        // 3. SITE GALLERY SECTION
        const galleryContainer = document.getElementById('modal-site-gallery');
        const gallerySection = document.getElementById('gallery-section');
        
        if (site.gallery && Array.isArray(site.gallery) && site.gallery.length > 0) {
            // Handle array format from updated API
            galleryContainer.innerHTML = site.gallery.map(img => 
                `<img src="${img}" class="gallery-thumb" onclick="window.open('${img}', '_blank')" />`
            ).join('');
            gallerySection.style.display = 'block';
        } else if (site.gallery && typeof site.gallery === 'string' && site.gallery !== 'null') {
            // Handle legacy space-separated string format (fallback)
            const images = site.gallery.split(' ').filter(img => img.trim() !== '');
            galleryContainer.innerHTML = images.map(img => 
                `<img src="${img.trim()}" class="gallery-thumb" onclick="window.open('${img.trim()}', '_blank')" />`
            ).join('');
            gallerySection.style.display = images.length > 0 ? 'block' : 'none';
        } else {
            galleryContainer.innerHTML = '<p class="no-gallery">No images available</p>';
            gallerySection.style.display = 'none';
        }

        // Show modal
        modal.style.display = 'flex';
    }

    showLaravelInstrumentModal(instrumentAssignment) {
        
        // Remove existing comprehensive details section if present
        const existingDetails = siteDetailsContainer.querySelector('.comprehensive-details');
        if (existingDetails) {
            existingDetails.remove();
        }

        // Create comprehensive details section
        const detailsSection = document.createElement('div');
        detailsSection.className = 'comprehensive-details';
        detailsSection.innerHTML = `
            <div class="details-section">
                <h4>📍 Site Details</h4>
                <div class="details-grid">
                    <div class="detail-item">
                        <label>Site Name:</label>
                        <span>${site.site_name || 'Not specified'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Location:</label>
                        <span>${site.place || 'Not specified'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Coordinates:</label>
                        <span>${site.latitude}, ${site.longitude}</span>
                    </div>
                    <div class="detail-item">
                        <label>Project:</label>
                        <span>${site.project?.name || 'Unknown Project'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Instruments Count:</label>
                        <span>${site.instrument_assignments ? site.instrument_assignments.length : 0} instruments</span>
                    </div>
                    <div class="detail-item">
                        <label>Project Status:</label>
                        <span>${site.project?.status || 'Unknown'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Created:</label>
                        <span>${site.created_at ? new Date(site.created_at).toLocaleDateString() : 'Not specified'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Last Updated:</label>
                        <span>${site.updated_at ? new Date(site.updated_at).toLocaleDateString() : 'Not specified'}</span>
                    </div>
                </div>
            </div>
            
            ${site.instrument_assignments && site.instrument_assignments.length > 0 ? `
            <div class="details-section">
                <h4>🔬 Instruments at this Site</h4>
                <div class="instruments-table-container" style="max-height: 400px; overflow-y: auto; border: 1px solid #ddd; border-radius: 8px;">
                    <table class="instruments-table" style="width: 100%; border-collapse: collapse; background: white;">
                        <thead style="position: sticky; top: 0; background: #f8f9fa; z-index: 1;">
                            <tr>
                                <th style="padding: 12px 8px; border-bottom: 2px solid #dee2e6; text-align: left; font-weight: 600; color: #495057;">Name</th>
                                <th style="padding: 12px 8px; border-bottom: 2px solid #dee2e6; text-align: left; font-weight: 600; color: #495057;">Variables</th>
                                <th style="padding: 12px 8px; border-bottom: 2px solid #dee2e6; text-align: left; font-weight: 600; color: #495057;">Measurement Type</th>
                                <th style="padding: 12px 8px; border-bottom: 2px solid #dee2e6; text-align: left; font-weight: 600; color: #495057;">Status</th>
                                <th style="padding: 12px 8px; border-bottom: 2px solid #dee2e6; text-align: left; font-weight: 600; color: #495057;">Address</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${site.instrument_assignments.slice(0, 10).map((assignment, index) => `
                                <tr style="border-bottom: 1px solid #dee2e6; ${index % 2 === 0 ? 'background-color: #f8f9fa;' : 'background-color: white;'}">
                                    <td style="padding: 10px 8px; vertical-align: top;">
                                        <strong>${assignment.instrument?.name || 'Unknown Instrument'}</strong>
                                        ${assignment.instrument?.description ? `<br><small style="color: #6c757d;">${assignment.instrument.description.length > 50 ? assignment.instrument.description.substring(0, 50) + '...' : assignment.instrument.description}</small>` : ''}
                                    </td>
                                    <td style="padding: 10px 8px; vertical-align: top;">
                                        ${assignment.variables_measured || 'Not specified'}
                                    </td>
                                    <td style="padding: 10px 8px; vertical-align: top;">
                                        ${assignment.measurement_type || 'Not specified'}
                                    </td>
                                    <td style="padding: 10px 8px; vertical-align: top;">
                                        <span style="
                                            padding: 4px 8px; 
                                            border-radius: 12px; 
                                            font-size: 12px; 
                                            font-weight: 500;
                                            ${assignment.is_active ? 
                                                'background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb;' : 
                                                'background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;'
                                            }
                                        ">
                                            ${assignment.is_active ? '✅ Active' : '❌ Inactive'}
                                        </span>
                                    </td>
                                    <td style="padding: 10px 8px; vertical-align: top; word-break: break-word; max-width: 150px;">
                                        ${assignment.instrument_address || 'Not specified'}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    ${site.instrument_assignments.length > 10 ? `
                        <div style="padding: 10px; background-color: #f8f9fa; text-align: center; color: #6c757d; font-size: 14px; border-top: 1px solid #dee2e6;">
                            Showing 10 of ${site.instrument_assignments.length} instruments. Scroll to view all records.
                        </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}
            
            ${site.project?.description ? `
            <div class="details-section">
                <h4>📋 Project Description</h4>
                <p>${site.project.description}</p>
            </div>
            ` : ''}
        `;

        // Insert before the banner section
        const bannerImg = document.getElementById('modal-site-banner');
        bannerImg.parentNode.insertBefore(detailsSection, bannerImg);

        // Set banner image if available
        if (site.banner && site.banner !== 'null') {
            bannerImg.src = site.banner;
            bannerImg.style.display = 'block';
        } else {
            bannerImg.style.display = 'none';
        }

        // Set gallery images if available
        const galleryContainer = document.getElementById('modal-site-gallery');
        if (site.gallery && Array.isArray(site.gallery) && site.gallery.length > 0) {
            galleryContainer.innerHTML = site.gallery.map(img => 
                `<img src="${img}" class="gallery-thumb" onclick="window.open('${img}', '_blank')" />`
            ).join('');
            galleryContainer.style.display = site.gallery.length > 0 ? 'flex' : 'none';
        } else {
            galleryContainer.innerHTML = '';
            galleryContainer.style.display = 'none';
        }
        
        // Show modal
        modal.style.display = 'flex';
    }

    showLaravelInstrumentModal(instrumentAssignment) {
        // Create modal if it doesn't exist
        let modal = document.getElementById('instrument-modal');
        if (!modal) {
            modal = this.createInstrumentModal();
        }

        // Extract instrument data from the assignment - instrumentAssignment.instrument contains the actual instrument data
        const instrumentData = instrumentAssignment.instrument || {};
        const instrumentName = instrumentData.name || 'Unknown Instrument';
        const siteName = instrumentAssignment.site?.site_name || instrumentAssignment.site?.name || 'Unknown Site';
        const projectName = instrumentAssignment.project?.name || 'Unknown Project';
        const latitude = parseFloat(instrumentAssignment.latitude);
        const longitude = parseFloat(instrumentAssignment.longitude);

        // Get the instrument icon from API data or fallback to generated icon
        const apiIcon = instrumentData.icon;
        let instrumentIcon = '🔬'; // default fallback
        
        if (apiIcon && (apiIcon.startsWith('http') || apiIcon.startsWith('/storage') || apiIcon.includes('.'))) {
            // Use API image icon
            instrumentIcon = `<img src="${apiIcon}" style="width: 24px; height: 24px; object-fit: contain; border-radius: 4px;" onerror="this.outerHTML='🔬';" />`;
        } else {
            // Use the generated instrument icon from the existing function
            const generatedIcon = this.getInstrumentIcon(instrumentName, apiIcon);
            instrumentIcon = generatedIcon;
        }

        // Set modal title with the correct instrument icon
        const modalTitle = document.getElementById('modal-instrument-name');
        modalTitle.innerHTML = `${instrumentIcon} ${instrumentName}`;

        // Clear previous content
        const instrumentInfoGrid = document.getElementById('instrument-info-grid');
        const siteInfoGrid = document.getElementById('site-info-grid');
        const projectInfoGrid = document.getElementById('project-info-grid');
        
        instrumentInfoGrid.innerHTML = '';
        siteInfoGrid.innerHTML = '';
        projectInfoGrid.innerHTML = '';

        // 1. INSTRUMENT INFORMATION SECTION
        const instrumentInfoCards = [
            {
                icon: instrumentIcon,
                label: 'Instrument Name',
                value: instrumentName
            },
            {
                icon: '📊',
                label: 'Status',
                value: this.createStatusBadge(instrumentAssignment.is_active ? 'Active' : 'Inactive', instrumentAssignment.is_active)
            },
            {
                icon: '📍',
                label: 'Coordinates',
                value: `<span class="coordinates-link" onclick="window.open('https://www.google.com/maps?q=${latitude},${longitude}', '_blank')">${latitude}, ${longitude}</span>`
            },
            {
                icon: '🏠',
                label: 'Address',
                value: instrumentAssignment.instrument_address || 'Not specified'
            },
            {
                icon: '📏',
                label: 'Variables Measured',
                value: instrumentAssignment.variables_measured || 'Not specified'
            },
            {
                icon: '📋',
                label: 'Measurement Type',
                value: instrumentAssignment.measurement_type || 'Not specified'
            },
            {
                icon: '⏱️',
                label: 'Temporal Resolution',
                value: instrumentAssignment.temporal_resolution || 'Not specified'
            },
            {
                icon: '🔢',
                label: 'Number of Units',
                value: instrumentAssignment.number_of_units || '1'
            }
        ];

        if (instrumentData.description) {
            instrumentInfoCards.push({
                icon: '📝',
                label: 'Description',
                value: instrumentData.description,
                fullWidth: true
            });
        }

        instrumentInfoCards.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.className = `info-card ${card.fullWidth ? 'full-width' : ''}`;
            cardElement.innerHTML = `
                <div class="info-label">
                    <span>${card.icon}</span>
                    ${card.label}
                </div>
                <div class="info-value">${card.value}</div>
            `;
            instrumentInfoGrid.appendChild(cardElement);
        });

        // Setup Google Maps link
        const googleMapsLink = document.getElementById('google-maps-link');
        if (!isNaN(latitude) && !isNaN(longitude)) {
            googleMapsLink.href = `https://www.google.com/maps?q=${latitude},${longitude}&z=15`;
            googleMapsLink.style.display = 'inline-flex';
        } else {
            googleMapsLink.style.display = 'none';
        }

        // 2. SITE INFORMATION SECTION
        const siteData = instrumentAssignment.site || {};
        
        // Get the site icon from API data or fallback to default icon
        const apiSiteIcon = siteData.icon;
        let siteIcon = '🏢'; // default fallback
        
        if (apiSiteIcon && (apiSiteIcon.startsWith('http') || apiSiteIcon.startsWith('/storage') || apiSiteIcon.includes('.'))) {
            // Use API image icon
            siteIcon = `<img src="${apiSiteIcon}" style="width: 20px; height: 20px; object-fit: contain; border-radius: 4px;" onerror="this.outerHTML='🏢';" />`;
        }
        
        // Update the site section header icon
        const siteHeaderIcon = document.querySelector('#site-info-section .section-icon');
        if (siteHeaderIcon) {
            siteHeaderIcon.innerHTML = siteIcon;
        }
        
        const siteInfoCards = [
            {
                icon: siteIcon,
                label: 'Site Name',
                value: siteName
            },
            {
                icon: '📍',
                label: 'Location',
                value: siteData.place || 'Not specified'
            },
            {
                icon: '🗺️',
                label: 'Site Coordinates',
                value: siteData.latitude && siteData.longitude ? 
                    `<span class="coordinates-link" onclick="window.open('https://www.google.com/maps?q=${siteData.latitude},${siteData.longitude}', '_blank')">${siteData.latitude}, ${siteData.longitude}</span>` : 
                    'Not available'
            },
            {
                icon: '🔬',
                label: 'Total Instruments',
                value: siteData.instrument_assignments ? `${siteData.instrument_assignments.length} instruments` : 'Not specified'
            },
            {
                icon: '📅',
                label: 'Site Created',
                value: siteData.created_at ? new Date(siteData.created_at).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }) : 'Not specified'
            },
            {
                icon: '🔄',
                label: 'Last Updated',
                value: siteData.updated_at ? new Date(siteData.updated_at).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }) : 'Not specified'
            }
        ];

        siteInfoCards.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.className = 'info-card';
            cardElement.innerHTML = `
                <div class="info-label">
                    <span>${card.icon}</span>
                    ${card.label}
                </div>
                <div class="info-value">${card.value}</div>
            `;
            siteInfoGrid.appendChild(cardElement);
        });

        // 3. PROJECT INFORMATION SECTION
        const projectData = instrumentAssignment.project || {};
        const projectInfoCards = [
            {
                icon: '📋',
                label: 'Project Name',
                value: projectName
            },
            {
                icon: '📊',
                label: 'Project Status',
                value: projectData.status || 'Unknown'
            },
            {
                icon: '📅',
                label: 'Project Created',
                value: projectData.created_at ? new Date(projectData.created_at).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }) : 'Not specified'
            },
            {
                icon: '🔄',
                label: 'Last Updated',
                value: projectData.updated_at ? new Date(projectData.updated_at).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }) : 'Not specified'
            }
        ];

        projectInfoCards.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.className = 'info-card';
            cardElement.innerHTML = `
                <div class="info-label">
                    <span>${card.icon}</span>
                    ${card.label}
                </div>
                <div class="info-value">${card.value}</div>
            `;
            projectInfoGrid.appendChild(cardElement);
        });

        // Add project description if available
        const projectDescriptionContainer = document.getElementById('project-description-container');
        const projectDescription = document.getElementById('project-description');
        if (projectData.description) {
            projectDescription.textContent = projectData.description;
            projectDescriptionContainer.style.display = 'block';
        } else {
            projectDescriptionContainer.style.display = 'none';
        }

        // Set banner image if available (use site banner for instrument)
        const bannerImg = document.getElementById('modal-instrument-banner');
        if (siteData.banner && siteData.banner !== 'null') {
            bannerImg.src = siteData.banner;
            bannerImg.style.display = 'block';
        } else {
            bannerImg.style.display = 'none';
        }

        // Handle gallery images (use site gallery for instrument)
        const galleryContainer = document.getElementById('modal-instrument-gallery');
        const gallerySection = document.getElementById('gallery-section');
        galleryContainer.innerHTML = '';
        
        if (siteData.gallery && Array.isArray(siteData.gallery) && siteData.gallery.length > 0) {
            siteData.gallery.forEach(imageUrl => {
                const img = document.createElement('img');
                img.src = imageUrl;
                img.className = 'gallery-image';
                img.onclick = () => window.open(imageUrl, '_blank');
                galleryContainer.appendChild(img);
            });
            gallerySection.style.display = 'block';
        } else {
            gallerySection.style.display = 'none';
        }
        
        // Show modal
        modal.style.display = 'flex';
    }

    createStatusBadge(status, isActive) {
        const statusClass = isActive ? 'status-active' : 'status-inactive';
        const icon = isActive ? '✅' : '❌';
        return `<span class="status-badge ${statusClass}">${icon} ${status}</span>`;
    }

    createSitesLayer(projects) {
        this.sitesLayer = L.layerGroup();
        let siteMarkerCount = 0;
        const markers = []; // Batch markers for better performance
        
        
        projects.forEach((project) => {
            if (project.sites && project.sites.length > 0) {
                project.sites.forEach((site) => {
                    if (site.latitude && site.longitude) {
                        const marker = this.createSiteMarker(site, project);
                        if (marker) {
                            markers.push(marker);
                            siteMarkerCount++;
                        }
                    }
                });
            }
        });
        
        // Add all markers at once for better performance
        markers.forEach(marker => marker.addTo(this.sitesLayer));
        
        
        // Add to map if sites toggle is checked
        const sitesToggle = document.getElementById('toggle-sites');
        if (sitesToggle && sitesToggle.checked) {
            this.sitesLayer.addTo(this.map);
        }
    }
    
    createInstrumentsLayer(projects) {
        this.instrumentsLayer = L.layerGroup();
        let instrumentMarkerCount = 0;
        const markers = []; // Batch markers for better performance
        
        
        projects.forEach((project) => {
            if (project.sites && project.sites.length > 0) {
                project.sites.forEach((site) => {
                    if (site.instrument_assignments && site.instrument_assignments.length > 0) {
                        site.instrument_assignments.forEach((assignment, index) => {
                            if (site.latitude && site.longitude) {
                                const marker = this.createInstrumentMarker(assignment, site, project, index);
                                if (marker) {
                                    markers.push(marker);
                                    instrumentMarkerCount++;
                                }
                            }
                        });
                    }
                });
            }
        });
        
        // Add all markers at once for better performance
        markers.forEach(marker => marker.addTo(this.instrumentsLayer));
        
        
        // Add to map if instruments toggle is checked
        const instrumentsToggle = document.getElementById('toggle-instruments');
        if (instrumentsToggle && instrumentsToggle.checked) {
            this.instrumentsLayer.addTo(this.map);
        }
    }
    
    createSiteMarker(site, project) {
        const lat = parseFloat(site.latitude);
        const lng = parseFloat(site.longitude);
        
        // Validate coordinates
        if (isNaN(lat) || isNaN(lng)) {
            console.error(`❌ Invalid coordinates for ${site.site_name}: lat=${lat}, lng=${lng}`);
            return null;
        }
        
        // Create custom pin-style icon using site icon URL if available, otherwise default pin
        let iconHtml = '';
        if (site.icon && (site.icon.startsWith('http') || site.icon.startsWith('/storage'))) {
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
            this.showSiteModal(site, project);
        });
        
        return marker;
    }
    
    
    createInstrumentMarker(assignment, site, project, index) {
        const lat = parseFloat(site.latitude);
        const lng = parseFloat(site.longitude);
        
        // Validate coordinates
        if (isNaN(lat) || isNaN(lng)) {
            console.error(`❌ Invalid coordinates for instrument at ${site.site_name}: lat=${lat}, lng=${lng}`);
            return null;
        }
        
        // Offset instrument markers slightly to avoid overlap with site markers
        const offsetLat = lat + (index * 0.001);
        const offsetLng = lng + (index * 0.001);
        
        // Get status-based color and instrument icon
        const statusColors = {
            'Maintenance': '#f59e0b',
            'Available': '#10b981', 
            'In Use': '#3b82f6',
            'Offline': '#ef4444'
        };
        const statusColor = statusColors[assignment.status] || '#6b7280';
        
        // Get instrument icon based on instrument name, custom icon, or use default
        const instrumentIcon = this.getInstrumentIcon(assignment.instrument_name, assignment.icon);
        
        // Create custom pin-style icon for instrument with real icon
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
                    border-top: 10px solid ${statusColor};
                "></div>
                <div style="
                    position: absolute;
                    top: 0;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    background: ${statusColor};
                    border: 3px solid white;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 12px;
                    font-weight: bold;
                ">
                    ${instrumentIcon}
                </div>
            </div>
        `;
        
        const instrumentMarkerIcon = L.divIcon({
            html: iconHtml,
            className: 'custom-instrument-marker',
            iconSize: [35, 45],
            iconAnchor: [17, 45]
        });
        
        const marker = L.marker([offsetLat, offsetLng], { icon: instrumentMarkerIcon });
        
        // Add status data attribute to the marker element for CSS styling
        marker.on('add', function() {
            const markerElement = this.getElement();
            if (markerElement) {
                markerElement.setAttribute('data-status', assignment.status || 'Unknown');
                markerElement.setAttribute('data-instrument', assignment.instrument_name || 'Unknown');
            }
        });
        
        // Add click handler to show modal (popup/tooltip disabled)
        marker.on('click', () => {
            this.showInstrumentModal(assignment, site, project);
        });
        
        return marker;
    }
    
    getInstrumentIcon(instrumentName, customIcon = null) {
        
        // First priority: Check if there's a custom icon URL provided
        if (customIcon && (customIcon.startsWith('http') || customIcon.startsWith('/storage') || customIcon.includes('.'))) {
            return `<img src="${customIcon}" style="width: 18px; height: 18px; object-fit: contain; border-radius: 2px;" onerror="this.style.display='none'; this.parentElement.innerHTML='📡'; console.error('Failed to load custom icon: ${customIcon}');" />`;
        }
        
        if (!instrumentName) {
            return '📡'; // Default icon for unknown instruments
        }
        
        const name = instrumentName.toLowerCase();
        
        // Define instrument icon mappings based on common instrument names  
        // Use more specific matches first, then general ones
        const iconMap = {
            // Radar and Communication Instruments (specific matches first)
            'radar': '📡',
            'c-band': '📡',
            'dual polarization': '📡',
            'polarization': '📡',
            
            // Weather and Environmental Instruments
            'weather station': '🌤️',
            'weather': '🌤️',
            'anemometer': '💨',
            'wind': '💨',
            'barometer': '🌡️',
            'pressure': '🌡️',
            'thermometer': '🌡️',
            'temperature': '🌡️',
            'hygrometer': '💧',
            'humidity': '💧',
            'rain gauge': '🌧️',
            'rainfall': '🌧️',
            'precipitation': '🌧️',
            
            // Seismic and Geological Instruments
            'seismometer': '📊',
            'seismic': '📊',
            'accelerometer': '📈',
            'accelerograph': '📈',
            'tiltmeter': '📐',
            'tilt': '📐',
            'inclinometer': '📐',
            'strain gauge': '⚖️',
            'strain': '⚖️',
            'extensometer': '📏',
            'gps': '🛰️',
            'gnss': '🛰️',
            
            // Water and Hydrology Instruments
            'water level': '🌊',
            'piezometer': '🌊',
            'flow meter': '🌊',
            'streamflow': '🌊',
            'tide gauge': '🌊',
            'current meter': '🌊',
            'discharge': '🌊',
            
            // Air Quality and Atmospheric Instruments
            'air quality': '🌬️',
            'particulate': '🌬️',
            'pm2.5': '🌬️',
            'pm10': '🌬️',
            'gas sensor': '🌬️',
            'pollution': '🌬️',
            'co2': '🌬️',
            'ozone': '🌬️',
            
            // Radiation and Nuclear Instruments
            'radiation': '☢️',
            'geiger': '☢️',
            'dosimeter': '☢️',
            'radioactivity': '☢️',
            
            // Communication and Data Instruments (more general matches at the end)
            'antenna': '📡',
            'transmitter': '📡',
            'receiver': '📡',
            'communication': '📡',
            'radio': '📻',
            'modem': '📡',
            'telemetry': '📡',
            'data logger': '💾',
            'logger': '💾',
            
            // Power and Electrical Instruments
            'solar panel': '☀️',
            'solar': '☀️',
            'battery': '🔋',
            'power supply': '🔋',
            'electrical': '⚡',
            'voltage': '⚡',
            'current': '⚡',
            
            // Optical and Camera Instruments
            'camera': '📷',
            'webcam': '📷',
            'photo': '📷',
            'laser': '🔴',
            'lidar': '🔴',
            'optical': '👁️',
            
            // Generic Sensors (most general ones at the end)
            'sensor': '🔍',
            'detector': '🔍',
            'monitor': '📊',
            'meter': '📊',
            'gauge': '📊',
            'instrument': '📡',
            
            // Research and Scientific
            'spectrometer': '🔬',
            'analyzer': '🔬',
            'probe': '🔬',
            'sampler': '🔬',
            'laboratory': '🧪',
            'lab': '🧪'
        };
        
        // Find matching icon - check for exact and substring matches
        for (const [key, icon] of Object.entries(iconMap)) {
            if (name.includes(key)) {
                return icon;
            }
        }
        
        // Default fallback icon
        return '📡';
    }
    
    
    showSiteModal(site, project) {
        // Create modal if it doesn't exist
        let modal = document.getElementById('site-modal');
        if (!modal) {
            modal = this.createSiteModal();
        }

        // Get site icon from API or fallback
        const apiSiteIcon = site.icon;
        let siteIcon = '📍'; // default fallback
        
        if (apiSiteIcon && (apiSiteIcon.startsWith('http') || apiSiteIcon.startsWith('/storage') || apiSiteIcon.includes('.'))) {
            // Use API image icon
            siteIcon = `<img src="${apiSiteIcon}" style="width: 24px; height: 24px; object-fit: contain; border-radius: 4px;" onerror="this.outerHTML='📍';" />`;
        }

        // Set modal title with site icon
        const modalTitle = document.getElementById('modal-site-name');
        const siteName = site.site_name || site.name || 'Unknown Site';
        modalTitle.innerHTML = `${siteIcon} ${siteName}`;

        // Update the site section header icon
        const siteHeaderIcon = document.querySelector('#site-details-section .section-icon');
        if (siteHeaderIcon) {
            siteHeaderIcon.innerHTML = siteIcon;
        }

        // Clear previous content
        const siteDetailsGrid = document.getElementById('site-details-grid');
        const projectDetailsGrid = document.getElementById('project-details-grid');
        
        siteDetailsGrid.innerHTML = '';
        projectDetailsGrid.innerHTML = '';

        // 1. SITE DETAILS SECTION
        const latitude = parseFloat(site.latitude);
        const longitude = parseFloat(site.longitude);
        
        const siteDetailsCards = [
            {
                icon: siteIcon,
                label: 'Site Name',
                value: siteName
            },
            {
                icon: '📍',
                label: 'Location',
                value: site.place || 'Not specified'
            },
            {
                icon: '🗺️',
                label: 'Coordinates',
                value: `<span class="coordinates-link" onclick="window.open('https://www.google.com/maps?q=${latitude},${longitude}', '_blank')">${latitude}, ${longitude}</span>`
            },
            {
                icon: '🏢',
                label: 'Site Type',
                value: site.site_type || 'Not specified'
            },
            {
                icon: '📅',
                label: 'Created Date',
                value: site.created_at ? new Date(site.created_at).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }) : 'Not specified'
            },
            {
                icon: '🔄',
                label: 'Last Updated',
                value: site.updated_at ? new Date(site.updated_at).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }) : 'Not specified'
            }
        ];

        if (site.description) {
            siteDetailsCards.push({
                icon: '📝',
                label: 'Site Description',
                value: site.description,
                fullWidth: true
            });
        }

        siteDetailsCards.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.className = `info-card ${card.fullWidth ? 'full-width' : ''}`;
            cardElement.innerHTML = `
                <div class="info-label">
                    <span>${card.icon}</span>
                    ${card.label}
                </div>
                <div class="info-value">${card.value}</div>
            `;
            siteDetailsGrid.appendChild(cardElement);
        });

        // Setup Google Maps link
        const googleMapsLink = document.getElementById('google-maps-site-link');
        if (!isNaN(latitude) && !isNaN(longitude)) {
            googleMapsLink.href = `https://www.google.com/maps?q=${latitude},${longitude}&z=15`;
            googleMapsLink.style.display = 'inline-flex';
        } else {
            googleMapsLink.style.display = 'none';
        }

        // 2. PROJECT INFORMATION SECTION
        const projectData = project || {};
        const projectDetailsCards = [
            {
                icon: '🆔',
                label: 'Project ID',
                value: projectData.id || 'Not specified'
            },
            {
                icon: '📝',
                label: 'Project Name',
                value: projectData.name || 'Not specified'
            }
        ];

        if (projectData.description) {
            projectDetailsCards.push({
                icon: '📝',
                label: 'Project Description',
                value: projectData.description,
                fullWidth: true
            });
        }

        projectDetailsCards.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.className = `info-card ${card.fullWidth ? 'full-width' : ''}`;
            cardElement.innerHTML = `
                <div class="info-label">
                    <span>${card.icon}</span>
                    ${card.label}
                </div>
                <div class="info-value">${card.value}</div>
            `;
            projectDetailsGrid.appendChild(cardElement);
        });

        // 3. SITE GALLERY SECTION
        const galleryContainer = document.getElementById('modal-site-gallery');
        const gallerySection = document.getElementById('gallery-section');
        
        if (site.gallery && Array.isArray(site.gallery) && site.gallery.length > 0) {
            // Handle array format from updated API
            galleryContainer.innerHTML = site.gallery.map(img => 
                `<img src="${img}" class="gallery-thumb" onclick="window.open('${img}', '_blank')" />`
            ).join('');
            gallerySection.style.display = 'block';
        } else if (site.gallery && typeof site.gallery === 'string' && site.gallery !== 'null') {
            // Handle legacy space-separated string format (fallback)
            const images = site.gallery.split(' ').filter(img => img.trim() !== '');
            galleryContainer.innerHTML = images.map(img => 
                `<img src="${img.trim()}" class="gallery-thumb" onclick="window.open('${img.trim()}', '_blank')" />`
            ).join('');
            gallerySection.style.display = images.length > 0 ? 'block' : 'none';
        } else {
            galleryContainer.innerHTML = '<p class="no-gallery">No images available</p>';
            gallerySection.style.display = 'none';
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
        document.getElementById('modal-instrument-name').textContent = `${assignment.instrument_name || 'Instrument'} - ${site.site_name}`;
        document.getElementById('modal-instrument-type').textContent = assignment.instrument_name || 'Not specified';
        document.getElementById('modal-instrument-site').textContent = site.site_name;
        document.getElementById('modal-instrument-project').textContent = project.name;
        document.getElementById('modal-instrument-id').textContent = assignment.id || 'N/A';
        document.getElementById('modal-instrument-status').textContent = assignment.status || 'Unknown';
        document.getElementById('modal-instrument-coordinates').textContent = `${site.latitude}, ${site.longitude}`;
        document.getElementById('modal-instrument-location').textContent = site.place || 'Not specified';
        document.getElementById('modal-instrument-project-description').textContent = project.description || 'No description available';
        
        // Set banner image if available (use site banner for instrument)
        const bannerImg = document.getElementById('modal-instrument-banner');
        if (site.banner && site.banner !== 'null') {
            bannerImg.src = site.banner;
            bannerImg.style.display = 'block';
        } else {
            bannerImg.style.display = 'none';
        }
        
        // Handle gallery images (use site gallery for instrument) - Same style as site modal
        const galleryContainer = document.getElementById('modal-instrument-gallery');
        if (site.gallery && Array.isArray(site.gallery) && site.gallery.length > 0) {
            // Handle array format from updated API (same as site modal)
            galleryContainer.innerHTML = site.gallery.map(img => 
                `<img src="${img}" class="gallery-thumb" onclick="window.open('${img}', '_blank')" />`
            ).join('');
            galleryContainer.style.display = site.gallery.length > 0 ? 'flex' : 'none';
        } else if (site.gallery && typeof site.gallery === 'string' && site.gallery !== 'null') {
            // Handle legacy space-separated string format (fallback) - Same as site modal
            const images = site.gallery.split(' ').filter(img => img.trim() !== '');
            galleryContainer.innerHTML = images.map(img => 
                `<img src="${img.trim()}" class="gallery-thumb" onclick="window.open('${img.trim()}', '_blank')" />`
            ).join('');
            galleryContainer.style.display = images.length > 0 ? 'flex' : 'none';
        } else {
            galleryContainer.innerHTML = '';
            galleryContainer.style.display = 'none';
        }
        
        // Show modal
        modal.style.display = 'flex';
    }
    
    createSiteModal() {
        const modalHtml = `
            <div id="site-modal" class="modal" style="display: none;">
                <div class="modal-content site-modal">
                    <div class="modal-header">
                        <h4 class="modal-title" id="modal-site-name">📍 Site Details</h4>
                        <button type="button" class="close-btn" onclick="document.getElementById('site-modal').style.display='none'">&times;</button>
                    </div>
                    <div class="modal-body">
                        <!-- Banner Image Section -->
                        <img id="modal-site-banner" class="banner-image" style="display: none;" />
                        
                        <!-- Site Information Section -->
                        <div class="modal-section" id="site-details-section">
                            <div class="section-header">
                                <h3 class="section-title">
                                    <span class="section-icon">📍</span>
                                    Site Information
                                </h3>
                            </div>
                            <div class="section-content">
                                <div class="info-grid" id="site-details-grid">
                                    <!-- Dynamic site details will be inserted here -->
                                </div>
                                <div class="action-buttons">
                                    <a id="google-maps-site-link" class="btn-google-map" target="_blank" style="display: none;">
                                        <span>🗺️</span>
                                        View on Google Maps
                                    </a>
                                </div>
                            </div>
                        </div>

                        <!-- Project Information Section -->
                        <div class="modal-section" id="project-details-section">
                            <div class="section-header">
                                <h3 class="section-title">
                                    <span class="section-icon">📝</span>
                                    Project Information
                                </h3>
                            </div>
                            <div class="section-content">
                                <div class="info-grid" id="project-details-grid">
                                    <!-- Dynamic project details will be inserted here -->
                                </div>
                                <div id="project-description-container" style="display: none;">
                                    <div class="project-description">
                                        <h4>📄 Project Description</h4>
                                        <div id="project-description-content" class="description-content"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Site Gallery Section -->
                        <div class="modal-section" id="gallery-section">
                            <div class="section-header">
                                <h3 class="section-title">
                                    <span class="section-icon">🖼️</span>
                                    Site Gallery
                                </h3>
                            </div>
                            <div class="section-content">
                                <div id="modal-site-gallery" class="site-gallery">
                                    <!-- Dynamic gallery will be inserted here -->
                                </div>
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
                <div class="modal-content instrument-modal">
                    <div class="modal-header">
                        <h4 class="modal-title" id="modal-instrument-name">🔬 Instrument Details</h4>
                        <button type="button" class="close-btn" onclick="document.getElementById('instrument-modal').style.display='none'">&times;</button>
                    </div>
                    <div class="modal-body">
                        <!-- Banner Image Section -->
                        <img id="modal-instrument-banner" class="banner-image" style="display: none;" />
                        
                        <!-- Instrument Information Section -->
                        <div class="modal-section" id="instrument-info-section">
                            <div class="section-header">
                                <h3 class="section-title">
                                    <span class="section-icon">🔬</span>
                                    Instrument Information
                                </h3>
                            </div>
                            <div class="section-content">
                                <div class="info-grid" id="instrument-info-grid">
                                    <!-- Dynamic instrument info will be inserted here -->
                                </div>
                                <div class="action-buttons">
                                    <a id="google-maps-link" class="btn-google-map" target="_blank" style="display: none;">
                                        <span>🗺️</span>
                                        View on Google Maps
                                    </a>
                                </div>
                            </div>
                        </div>

                        <!-- Site Information Section -->
                        <div class="modal-section" id="site-info-section">
                            <div class="section-header">
                                <h3 class="section-title">
                                    <span class="section-icon">📍</span>
                                    Site Information
                                </h3>
                            </div>
                            <div class="section-content">
                                <div class="info-grid" id="site-info-grid">
                                    <!-- Dynamic site info will be inserted here -->
                                </div>
                            </div>
                        </div>

                        <!-- Project Information Section -->
                        <div class="modal-section" id="project-info-section">
                            <div class="section-header">
                                <h3 class="section-title">
                                    <span class="section-icon">📋</span>
                                    Project Information
                                </h3>
                            </div>
                            <div class="section-content">
                                <div class="info-grid" id="project-info-grid">
                                    <!-- Dynamic project info will be inserted here -->
                                </div>
                                <div id="project-description-container" style="display: none;">
                                    <div class="description-text" id="project-description"></div>
                                </div>
                            </div>
                        </div>

                        <!-- Gallery Section -->
                        <div class="modal-section" id="gallery-section" style="display: none;">
                            <div class="section-header">
                                <h3 class="section-title">
                                    <span class="section-icon">📸</span>
                                    Gallery
                                </h3>
                            </div>
                            <div class="section-content">
                                <div id="modal-instrument-gallery" class="image-gallery"></div>
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
                // Fit bounds to the selected state
                this.map.fitBounds(e.target.getBounds());
                
                // Open the popup to show state information
                e.target.openPopup();
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
                // Fit bounds to the selected district
                this.map.fitBounds(e.target.getBounds());
                
                // Open the popup to show district information
                e.target.openPopup();
            }
        });
    }
    
    toggleLayer(layerName, isVisible) {
        
        if (layerName === 'states' && this.stateLayer) {
            if (isVisible) {
                this.stateLayer.addTo(this.map);
            } else {
                this.map.removeLayer(this.stateLayer);
            }
        } else if (layerName === 'districts') {
            if (isVisible) {
                if (!this.districtLayer) {
                    // Show center loading for districts lazy loading
                    this.showLoading();
                    this.loadDistrictsLayer().then(() => {
                        this.hideLoading();
                        if (this.districtLayer) {
                            this.districtLayer.addTo(this.map);
                        }
                    }).catch((error) => {
                        console.error('Failed to load districts:', error);
                        this.hideLoading();
                    });
                } else {
                    this.districtLayer.addTo(this.map);
                }
            } else if (this.districtLayer) {
                this.map.removeLayer(this.districtLayer);
            }
        } else if (layerName === 'sites' && this.sitesLayer) {
            if (isVisible) {
                this.sitesLayer.addTo(this.map);
            } else {
                this.map.removeLayer(this.sitesLayer);
            }
        } else if (layerName === 'instruments' && this.instrumentsLayer) {
            if (isVisible) {
                this.instrumentsLayer.addTo(this.map);
            } else {
                this.map.removeLayer(this.instrumentsLayer);
            }
        } else {
            console.warn(`⚠️ Layer '${layerName}' not found or not initialized`);
        }
        
        this.updateStatistics();
    }
    
    changeMapStyle(styleKey) {
        const style = this.mapStyles[styleKey];
        
        if (!style) {
            console.error('Invalid map style:', styleKey);
            return;
        }
        
        if (this.currentBaseLayer) {
            this.map.removeLayer(this.currentBaseLayer);
            this.currentBaseLayer = null;
        }
        
        // Only add tile layer if URL exists (not for "Only Shape" mode)
        if (style.url) {
            this.currentBaseLayer = L.tileLayer(style.url, {
                attribution: style.attribution,
                maxZoom: 18,
                minZoom: 3,
                tileSize: 256,
                zoomOffset: 0,
                bounds: style.bounds // Restrict tile loading to India region
            });
            
            this.currentBaseLayer.addTo(this.map);
        }
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
    }
    
    updateStatistics() {
        // const visibleLayers = 
        //     (document.getElementById('toggle-states').checked ? 1 : 0) +
        //     (document.getElementById('toggle-districts').checked ? 1 : 0) +
        //     (document.getElementById('toggle-projects') && document.getElementById('toggle-projects').checked ? 1 : 0);
        
        // const totalFeatures = this.stateCount + this.districtCount;
        
        // document.getElementById('total-features').textContent = totalFeatures;
        // document.getElementById('visible-layers').textContent = visibleLayers;
    }
    
    resetMapView() {
        // Reset view to India bounds with proper centering
        const indiaBounds = L.latLngBounds([6.754, 68.186], [37.042, 97.415]);
        this.map.fitBounds(indiaBounds, {
            padding: [20, 20],
            maxZoom: 5 // Ensure we don't zoom too close
        });
    }
    
    showLoading() {
        document.getElementById('loading-indicator').style.display = 'flex';
    }
    
    hideLoading() {
        document.getElementById('loading-indicator').style.display = 'none';
    }
    
    showProgressIndicator() {
        // Create or show a subtle progress indicator
        let indicator = document.getElementById('progress-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'progress-indicator';
            indicator.innerHTML = `
                <div style="
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: rgba(0,0,0,0.7);
                    color: white;
                    padding: 8px 16px;
                    border-radius: 20px;
                    font-size: 12px;
                    z-index: 2000;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                ">
                    <div class="mini-spinner" style="
                        width: 16px;
                        height: 16px;
                        border: 2px solid rgba(255,255,255,0.3);
                        border-top: 2px solid white;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                    "></div>
                    Loading data...
                </div>
            `;
            document.body.appendChild(indicator);
        }
        indicator.style.display = 'block';
    }
    
    hideProgressIndicator() {
        const indicator = document.getElementById('progress-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
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
    window.indiaMap = new IndiaInteractiveMap();
    
    // Add some helpful console information
});

// Export for use in other scripts (future instrument integration)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IndiaInteractiveMap;
}
