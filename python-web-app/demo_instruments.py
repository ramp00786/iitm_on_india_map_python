#!/usr/bin/env python3
"""
Demo Instrument Data Generator
Generates sample instrument data to test the icon display functionality
"""

import json
import random

# Sample instrument data with different types and statuses
SAMPLE_INSTRUMENTS = [
    {
        "id": 1,
        "name": "Weather Station Delhi",
        "description": "Comprehensive weather monitoring station",
        "sites": [
            {
                "id": 1,
                "site_name": "Delhi University Campus",
                "place": "Delhi, India",
                "latitude": 28.6857,
                "longitude": 77.2100,
                "banner": None,
                "gallery": [],
                "icon": None,
                "instrument_assignments": [
                    {
                        "id": 1,
                        "instrument_name": "Weather Station",
                        "status": "Available",
                        "icon": "https://img.icons8.com/fluency/48/000000/weather.png"
                    },
                    {
                        "id": 2,
                        "instrument_name": "Anemometer",
                        "status": "In Use",
                        "icon": "https://img.icons8.com/fluency/48/000000/wind.png"
                    },
                    {
                        "id": 3,
                        "instrument_name": "Rain Gauge",
                        "status": "Available",
                        "icon": "https://img.icons8.com/fluency/48/000000/rain.png"
                    }
                ]
            }
        ]
    },
    {
        "id": 2,
        "name": "Seismic Research Project Mumbai",
        "description": "Earthquake monitoring and research facility",
        "sites": [
            {
                "id": 2,
                "site_name": "TIFR Mumbai",
                "place": "Mumbai, Maharashtra",
                "latitude": 19.0760,
                "longitude": 72.8777,
                "banner": None,
                "gallery": [],
                "icon": None,
                "instrument_assignments": [
                    {
                        "id": 4,
                        "instrument_name": "Seismometer",
                        "status": "In Use",
                        "icon": "https://img.icons8.com/fluency/48/000000/seismometer.png"
                    },
                    {
                        "id": 5,
                        "instrument_name": "Accelerometer",
                        "status": "Available",
                        "icon": "https://img.icons8.com/fluency/48/000000/accelerometer.png"
                    },
                    {
                        "id": 6,
                        "instrument_name": "GPS Station",
                        "status": "Maintenance",
                        "icon": "https://img.icons8.com/fluency/48/000000/gps-device.png"
                    }
                ]
            }
        ]
    },
    {
        "id": 3,
        "name": "Hydrology Research Ganga",
        "description": "River flow and water quality monitoring",
        "sites": [
            {
                "id": 3,
                "site_name": "Haridwar Station",
                "place": "Haridwar, Uttarakhand",
                "latitude": 29.9457,
                "longitude": 78.1642,
                "banner": None,
                "gallery": [],
                "icon": None,
                "instrument_assignments": [
                    {
                        "id": 7,
                        "instrument_name": "Water Level Gauge",
                        "status": "In Use",
                        "icon": "https://img.icons8.com/fluency/48/000000/water-level.png"
                    },
                    {
                        "id": 8,
                        "instrument_name": "Flow Meter",
                        "status": "Available",
                        "icon": "https://img.icons8.com/fluency/48/000000/water-flow.png"
                    },
                    {
                        "id": 9,
                        "instrument_name": "Current Meter",
                        "status": "Offline",
                        "icon": "https://img.icons8.com/fluency/48/000000/current.png"
                    }
                ]
            }
        ]
    },
    {
        "id": 4,
        "name": "Air Quality Monitoring Network",
        "description": "Urban air pollution monitoring system",
        "sites": [
            {
                "id": 4,
                "site_name": "IIT Chennai",
                "place": "Chennai, Tamil Nadu",
                "latitude": 12.9916,
                "longitude": 80.2336,
                "banner": None,
                "gallery": [],
                "icon": None,
                "instrument_assignments": [
                    {
                        "id": 10,
                        "instrument_name": "Air Quality Monitor",
                        "status": "In Use",
                        "icon": "https://img.icons8.com/fluency/48/000000/air-quality.png"
                    },
                    {
                        "id": 11,
                        "instrument_name": "PM2.5 Sensor",
                        "status": "Available",
                        "icon": "https://img.icons8.com/fluency/48/000000/dust.png"
                    },
                    {
                        "id": 12,
                        "instrument_name": "Gas Sensor",
                        "status": "Maintenance",
                        "icon": "https://img.icons8.com/fluency/48/000000/gas-sensor.png"
                    }
                ]
            }
        ]
    },
    {
        "id": 5,
        "name": "Solar Radiation Study",
        "description": "Solar energy potential assessment",
        "sites": [
            {
                "id": 5,
                "site_name": "Rajasthan Solar Park",
                "place": "Jodhpur, Rajasthan",
                "latitude": 26.2389,
                "longitude": 73.0243,
                "banner": None,
                "gallery": [],
                "icon": None,
                "instrument_assignments": [
                    {
                        "id": 13,
                        "instrument_name": "Solar Panel",
                        "status": "In Use",
                        "icon": "https://img.icons8.com/fluency/48/000000/solar-panel.png"
                    },
                    {
                        "id": 14,
                        "instrument_name": "Radiation Detector",
                        "status": "Available",
                        "icon": "https://img.icons8.com/fluency/48/000000/radiation.png"
                    },
                    {
                        "id": 15,
                        "instrument_name": "Data Logger",
                        "status": "Available",
                        "icon": "https://img.icons8.com/fluency/48/000000/database.png"
                    }
                ]
            }
        ]
    },
    {
        "id": 6,
        "name": "Geological Survey Northeast",
        "description": "Geological research in mountainous regions",
        "sites": [
            {
                "id": 6,
                "site_name": "Shillong Research Center",
                "place": "Shillong, Meghalaya",
                "latitude": 25.5788,
                "longitude": 91.8933,
                "banner": None,
                "gallery": [],
                "icon": None,
                "instrument_assignments": [
                    {
                        "id": 16,
                        "instrument_name": "Tiltmeter",
                        "status": "In Use",
                        "icon": None
                    },
                    {
                        "id": 17,
                        "instrument_name": "Strain Gauge",
                        "status": "Maintenance",
                        "icon": None
                    },
                    {
                        "id": 18,
                        "instrument_name": "GNSS Receiver",
                        "status": "Available",
                        "icon": None
                    }
                ]
            }
        ]
    }
]

def save_demo_data():
    """Save demo data to JSON file for testing"""
    filename = 'demo_projects.json'
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(SAMPLE_INSTRUMENTS, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Demo data saved to {filename}")
        print(f"📊 Generated {len(SAMPLE_INSTRUMENTS)} projects")
        
        total_sites = sum(len(project['sites']) for project in SAMPLE_INSTRUMENTS)
        total_instruments = sum(
            len(site['instrument_assignments']) 
            for project in SAMPLE_INSTRUMENTS 
            for site in project['sites']
        )
        
        print(f"🏢 Total sites: {total_sites}")
        print(f"🔬 Total instruments: {total_instruments}")
        
        # Count instruments by status
        status_count = {}
        for project in SAMPLE_INSTRUMENTS:
            for site in project['sites']:
                for instrument in site['instrument_assignments']:
                    status = instrument['status']
                    status_count[status] = status_count.get(status, 0) + 1
        
        print("\n📈 Instrument Status Summary:")
        for status, count in status_count.items():
            print(f"   {status}: {count}")
        
        print(f"\n🌐 You can test these at: http://localhost:5000")
        print("🔧 Restart the Flask app to load the demo data")
        
    except Exception as e:
        print(f"❌ Error saving demo data: {e}")

if __name__ == "__main__":
    save_demo_data()
