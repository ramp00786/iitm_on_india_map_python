# India Interactive Map - Python Flask Web Application

A simple and reliable Python web application for displaying India's interactive map using Flask and Leaflet.js.

## Features

- 🗺️ **Interactive Map**: Pan, zoom, and explore India's geography
- 🏛️ **Administrative Boundaries**: View states/UTs (37 features) and districts (667 features)
- 🎨 **Multiple Map Styles**: Satellite, Streets, Topographic, and OpenStreetMap
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🔧 **Instrument Ready**: Prepared for adding instrument markers and popups
- 🌐 **RESTful API**: JSON endpoints for GeoJSON data
- 📊 **Static Deployment**: Can be easily deployed to any server

## Technology Stack

- **Backend**: Python Flask
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Mapping**: Leaflet.js
- **Data**: GeoJSON (converted from shapefiles)

## Project Structure

```
python-web-app/
├── app.py                      # Flask application
├── requirements.txt            # Python dependencies
├── setup.bat                   # Setup script
├── templates/
│   ├── index.html             # Main page template
│   ├── 404.html               # Error page
│   └── 500.html               # Error page
├── static/
│   ├── css/
│   │   └── style.css          # Application styles
│   └── js/
│       └── map.js             # Interactive map JavaScript
└── README.md                  # This file
```

## Quick Start

### Prerequisites
- Python 3.7+
- GeoJSON files from the shapefile converter

### Installation

1. **Run the setup script**:
   ```bash
   setup.bat
   ```

2. **Activate virtual environment**:
   ```bash
   venv\Scripts\activate.bat
   ```

3. **Start the server**:
   ```bash
   python app.py
   ```

4. **Open your browser**:
   ```
   http://localhost:5000
   ```

## API Endpoints

The application provides RESTful API endpoints:

- `GET /` - Main interactive map page
- `GET /api/geojson/IND_WHOLE` - States/UTs GeoJSON data
- `GET /api/geojson/IND_adm2` - Districts GeoJSON data
- `GET /api/metadata` - Dataset metadata information

## Map Features

### Current Capabilities
- ✅ Interactive India boundaries display
- ✅ Click/hover events on regions
- ✅ Multiple base map styles
- ✅ Layer toggle controls
- ✅ Region information popups
- ✅ Responsive design
- ✅ Error handling

### Interactive Elements
- **Click regions** to view detailed information
- **Hover effects** for better user experience
- **Layer controls** to show/hide states or districts
- **Map style selector** for different views
- **Zoom and pan** controls

## Development

### Running in Development Mode
```bash
# Activate virtual environment
venv\Scripts\activate.bat

# Run with debug mode
python app.py
```

### Adding New Features
The application is structured for easy extension:

```javascript
// Example: Adding instrument markers
function addInstrumentMarkers(instruments) {
    instruments.forEach(instrument => {
        const marker = L.marker([instrument.lat, instrument.lng])
            .bindPopup(`
                <h4>${instrument.name}</h4>
                <p>Type: ${instrument.type}</p>
                <p>Status: ${instrument.status}</p>
            `);
        marker.addTo(window.indiaMap.map);
    });
}
```

## Deployment Options

### 1. Local Development Server
```bash
python app.py
```

### 2. Production WSGI Server
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### 3. Docker Deployment
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["python", "app.py"]
```

## Configuration

### Environment Variables
- `FLASK_ENV`: Set to 'production' for production deployment
- `FLASK_DEBUG`: Set to 'False' for production
- `PORT`: Server port (default: 5000)

### Customization
- **Map styles**: Edit `mapStyles` in `static/js/map.js`
- **Styling**: Modify `static/css/style.css`
- **API endpoints**: Add new routes in `app.py`

## Troubleshooting

### Common Issues

1. **GeoJSON files not found**:
   - Make sure the shapefile converter has been run
   - Check the path in `app.py` points to the correct GeoJSON directory

2. **Port already in use**:
   - Change the port in `app.py`: `app.run(port=5001)`
   - Or kill the process using the port

3. **Virtual environment issues**:
   - Delete `venv` folder and run `setup.bat` again
   - Make sure Python is in your PATH

## Browser Support

- Chrome/Chromium 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Performance Notes

- GeoJSON files are served via API endpoints for efficient loading
- Map tiles are cached by the browser
- Responsive design optimized for mobile devices
- Lazy loading of map layers

## Future Enhancements

The application is prepared for:
- 🔄 Instrument marker integration
- 🔄 Real-time data updates via WebSocket
- 🔄 Advanced filtering and search
- 🔄 Data visualization overlays
- 🔄 User authentication
- 🔄 Export functionality

## Security Considerations

For production deployment:
- Set `FLASK_ENV=production`
- Use a proper WSGI server like Gunicorn
- Implement rate limiting
- Add HTTPS
- Configure CORS appropriately

## License

This project is part of the India Interactive Mapping System.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the Flask logs in the console
3. Check browser developer tools for JavaScript errors
