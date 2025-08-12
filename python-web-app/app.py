"""
Flask Web Application for India Interactive Map
A simple Python web application serving interactive map with Leaflet.js
"""

from flask import Flask, render_template, jsonify, send_from_directory
import os
import json
from pathlib import Path

app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = 'india-interactive-map-2025'
app.config['DEBUG'] = True

# Paths
BASE_DIR = Path(__file__).parent
GEOJSON_DIR = BASE_DIR.parent / 'python-shapefile-converter' / 'geojson_output'

@app.route('/')
def index():
    """Main page with interactive map"""
    return render_template('index.html')

@app.route('/api/geojson/<filename>')
def get_geojson(filename):
    """API endpoint to serve GeoJSON files"""
    try:
        geojson_file = GEOJSON_DIR / f"{filename}.geojson"
        
        if not geojson_file.exists():
            return jsonify({'error': 'File not found'}), 404
        
        with open(geojson_file, 'r', encoding='utf-8') as f:
            geojson_data = json.load(f)
        
        return jsonify(geojson_data)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/metadata')
def get_metadata():
    """API endpoint to get metadata about available datasets"""
    try:
        metadata_file = GEOJSON_DIR / 'metadata.json'
        
        if metadata_file.exists():
            with open(metadata_file, 'r', encoding='utf-8') as f:
                metadata = json.load(f)
            return jsonify(metadata)
        else:
            # Generate basic metadata if file doesn't exist
            metadata = {
                'conversion_info': {
                    'total_files': 2,
                    'files': [
                        {'filename': 'IND_WHOLE.geojson', 'description': 'Indian states and union territories'},
                        {'filename': 'IND_adm2.geojson', 'description': 'Indian districts'}
                    ]
                }
            }
            return jsonify(metadata)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/projects')
def get_projects():
    """API endpoint to fetch project data from Laravel PMS"""
    try:
        import requests
        
        # Laravel API configuration
        LARAVEL_API_URL = 'https://pms.tropmet.res.in/api/projects-data'
        API_TOKEN = 'pms4-shape-files-integration-2025-secure-token'
        
        # Try Laravel API first
        try:
            response = requests.get(
                LARAVEL_API_URL,
                params={'token': API_TOKEN},
                timeout=5  # Reduced timeout
            )
            
            if response.status_code == 200:
                data = response.json()
                print("✅ Loaded data from Laravel API")
                return jsonify(data)
            else:
                print(f"⚠️ Laravel API error: {response.status_code}")
        except requests.RequestException as e:
            print(f"⚠️ Laravel API not available: {str(e)}")
        
        # Fallback: Load demo data if Laravel API fails
        demo_file = os.path.join(app.config['BASE_DIR'], 'demo_projects.json')
        if os.path.exists(demo_file):
            print("🔄 Loading demo project data as fallback...")
            with open(demo_file, 'r', encoding='utf-8') as f:
                demo_data = json.load(f)
                print(f"✅ Loaded {len(demo_data)} demo projects")
                return jsonify(demo_data)
        
        # If nothing is available, return empty array
        print("⚠️ No project data available (Laravel API and demo data both unavailable)")
        return jsonify([])
    
    except Exception as e:
        print(f"❌ Error in get_projects: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/static/<path:filename>')
def static_files(filename):
    """Serve static files"""
    return send_from_directory(BASE_DIR / 'static', filename)

@app.errorhandler(404)
def not_found(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    return render_template('500.html'), 500

if __name__ == '__main__':
    print("=" * 50)
    print("🗺️  India Interactive Map - Flask Web Application")
    print("=" * 50)
    print(f"📁 Base Directory: {BASE_DIR}")
    print(f"📂 GeoJSON Directory: {GEOJSON_DIR}")
    print(f"🌐 Server starting at: http://localhost:5000")
    print("=" * 50)
    
    # Check if GeoJSON files exist
    if GEOJSON_DIR.exists():
        geojson_files = list(GEOJSON_DIR.glob('*.geojson'))
        print(f"✅ Found {len(geojson_files)} GeoJSON files:")
        for file in geojson_files:
            print(f"   - {file.name}")
    else:
        print("⚠️  GeoJSON directory not found. Please run the shapefile converter first.")
    
    print("=" * 50)
    print("Press Ctrl+C to stop the server")
    print("=" * 50)
    
    app.run(host='0.0.0.0', port=5000, debug=True)
