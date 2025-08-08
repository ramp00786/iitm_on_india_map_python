# 🗺️ IITM India Interactive Map - Python Web Application

An interactive web-based mapping application for visualizing project sites and instruments across India, integrated with Laravel PMS4 API.

## 🚀 Features

- **Interactive Map**: Leaflet.js based map with Indian state and district boundaries
- **Project Integration**: Real-time data from Laravel PMS4 API
- **Dual Layer System**: Separate toggles for Sites (🏢) and Instruments (🔬)
- **Interactive Markers**: Click markers to view detailed information in modals
- **Responsive Design**: Mobile-friendly interface
- **Authentication**: Secure token-based API access

## 📁 Project Structure

```
Shape_files/
├── python-shapefile-converter/     # GeoJSON conversion utilities
│   ├── convert_shapefiles.py      # Main converter script
│   ├── geojson_output/             # Generated GeoJSON files
│   └── requirements.txt
├── python-web-app/                 # Main Flask application
│   ├── app.py                     # Flask server & API proxy
│   ├── static/
│   │   ├── css/style.css          # Styling
│   │   └── js/map.js              # Interactive map logic
│   ├── templates/index.html        # Main interface
│   └── requirements.txt
├── IND_*.shp                       # Original shapefiles
└── README.md
```

## 🛠️ Setup & Installation

### Prerequisites
- Python 3.7+
- Flask
- Laravel PMS4 API running on http://127.0.0.1:8000

### Installation

1. **Clone the repository:**
```bash
git clone git@github.com:ramp00786/iitm_on_india_map_python.git
cd iitm_on_india_map_python
```

2. **Setup Shapefile Converter:**
```bash
cd python-shapefile-converter
pip install -r requirements.txt
python convert_shapefiles.py
```

3. **Setup Web Application:**
```bash
cd python-web-app
pip install -r requirements.txt
python app.py
```

4. **Access the application:**
- Open browser: http://127.0.0.1:5000
- API endpoint: http://127.0.0.1:5000/api/projects

## 🔧 Configuration

### API Integration
The application integrates with Laravel PMS4 API using secure token authentication:

**Token:** `pms4-shape-files-integration-2025-secure-token`

**API Endpoint:** `http://127.0.0.1:8000/api/projects-data`

### Map Controls
- **States Toggle**: Show/hide Indian state boundaries
- **Districts Toggle**: Show/hide district boundaries  
- **Sites Toggle**: Show/hide project site markers (🏢)
- **Instruments Toggle**: Show/hide instrument markers (🔬)

## 📊 Data Structure

### Sites Data
```json
{
  "site_name": "Site Name",
  "latitude": "28.6139",
  "longitude": "77.2090", 
  "place": "Location Name",
  "icon": "base64_image_data",
  "banner": "image_url",
  "gallery": "space_separated_image_urls"
}
```

### Instruments Data
```json
{
  "id": "assignment_id",
  "instrument_name": "Instrument Name",
  "status": "Active/Inactive"
}
```

## 🎨 UI Components

### Interactive Map
- **Base Layer**: OpenStreetMap tiles
- **Boundary Layers**: India states and districts (GeoJSON)
- **Marker Layers**: Sites and instruments with custom icons
- **Popups**: Quick information display
- **Modals**: Detailed information with images

### Control Panel
- Layer toggles with real-time counts
- Map style selector
- Statistics display

## 🔍 Technical Details

### Backend (Flask)
- **Route**: `/` - Main application interface
- **Route**: `/api/projects` - Proxy to Laravel PMS4 API
- **Route**: `/api/geojson/<filename>` - GeoJSON data serving

### Frontend (JavaScript)
- **Class**: `IndiaInteractiveMap` - Main map controller
- **Methods**: 
  - `createSitesLayer()` - Site markers management
  - `createInstrumentsLayer()` - Instrument markers management
  - `toggleLayer()` - Layer visibility control
  - `showSiteModal()` / `showInstrumentModal()` - Information display

### Authentication
Token-based authentication with Laravel PMS4 system ensures secure data access.

## 🐛 Debugging

The application includes comprehensive logging:
- Marker creation tracking
- API call monitoring  
- Layer toggle states
- Coordinate validation

Check browser console for detailed logs.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📜 License

This project is licensed under the MIT License.

## 👨‍💻 Authors

- **ramp00786** - Initial work and development

## 🙏 Acknowledgments

- OpenStreetMap for map tiles
- Leaflet.js for mapping functionality
- Flask framework for backend
- Laravel PMS4 for data integration

---

**🌟 Star this repository if you find it helpful!**
