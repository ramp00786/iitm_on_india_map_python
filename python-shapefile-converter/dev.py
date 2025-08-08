#!/usr/bin/env python3
"""
Development runner script for the Shapefile Converter
Provides easy commands for development tasks
"""

import argparse
import subprocess
import sys
from pathlib import Path

def run_converter():
    """Run the shapefile converter"""
    print("🗺️  Running shapefile converter...")
    subprocess.run([sys.executable, "convert_shapefiles.py"])

def install_deps():
    """Install/update dependencies"""
    print("📦 Installing dependencies...")
    subprocess.run([sys.executable, "-m", "pip", "install", "--upgrade", "pip"])
    subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])

def clean_output():
    """Clean output directory"""
    print("🧹 Cleaning output directory...")
    output_dir = Path("geojson_output")
    if output_dir.exists():
        import shutil
        shutil.rmtree(output_dir)
        print("✓ Output directory cleaned")
    else:
        print("✓ Output directory already clean")

def dev_info():
    """Show development environment information"""
    print("🐍 Python Shapefile Converter - Development Info")
    print("=" * 50)
    
    # Python version
    print(f"Python Version: {sys.version}")
    
    # Virtual environment check
    if hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
        print("Virtual Environment: ✓ Active")
    else:
        print("Virtual Environment: ✗ Not active")
    
    # Check if dependencies are installed
    try:
        import geopandas
        print(f"GeoPandas: ✓ v{geopandas.__version__}")
    except ImportError:
        print("GeoPandas: ✗ Not installed")
    
    try:
        import fiona
        print(f"Fiona: ✓ v{fiona.__version__}")
    except ImportError:
        print("Fiona: ✗ Not installed")
    
    # Check input files
    parent_dir = Path("..").resolve()
    shapefiles = list(parent_dir.glob("*.shp"))
    print(f"\nShapefiles found: {len(shapefiles)}")
    for shp in shapefiles:
        print(f"  - {shp.name}")

def main():
    parser = argparse.ArgumentParser(description="Shapefile Converter Development Tool")
    parser.add_argument("command", choices=["convert", "install", "clean", "info"], 
                       help="Command to run")
    
    args = parser.parse_args()
    
    if args.command == "convert":
        run_converter()
    elif args.command == "install":
        install_deps()
    elif args.command == "clean":
        clean_output()
    elif args.command == "info":
        dev_info()

if __name__ == "__main__":
    main()
