# Shapefile to GeoJSON Converter

This Python application converts shapefiles to GeoJSON format for use in web mapping applications.

## Requirements

Install the required Python packages:

```bash
pip install geopandas
pip install fiona
```

## Usage

Run the conversion script:

```bash
python convert_shapefiles.py
```

This will:
1. Read all `.shp` files from the parent directory
2. Convert them to GeoJSON format
3. Save the converted files in the `geojson_output` directory
4. Generate a metadata file with information about the converted data

## Output Structure

```
geojson_output/
├── IND_adm2.geojson        # Administrative level 2 boundaries
├── IND_WHOLE.geojson       # Complete India boundary
└── metadata.json          # Metadata about converted files
```

## Features

- Automatic detection of all shapefiles in the input directory
- Conversion to GeoJSON format compatible with web mapping libraries
- Generation of metadata file with feature counts and property information
- Error handling and detailed logging
- Preservation of coordinate reference systems (CRS)

## Notes

- The script preserves all attributes from the original shapefiles
- Coordinate systems are maintained during conversion
- The output GeoJSON files are ready for use with Leaflet.js and other web mapping libraries
