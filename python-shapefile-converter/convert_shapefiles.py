"""
Shapefile to GeoJSON Converter
This script converts shapefiles to GeoJSON format for use in web mapping applications.
"""

import geopandas as gpd
import json
import os
from pathlib import Path

class ShapefileConverter:
    def __init__(self, input_dir, output_dir):
        self.input_dir = Path(input_dir)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
    
    def convert_shapefile_to_geojson(self, shapefile_path, output_name=None):
        """
        Convert a single shapefile to GeoJSON format
        """
        try:
            # Read shapefile
            print(f"Reading shapefile: {shapefile_path}")
            gdf = gpd.read_file(shapefile_path)
            
            # Set output filename
            if output_name is None:
                output_name = Path(shapefile_path).stem + '.geojson'
            
            output_path = self.output_dir / output_name
            
            # Convert to GeoJSON (using to_file with GeoJSON driver)
            print(f"Converting to GeoJSON: {output_path}")
            gdf.to_file(str(output_path), driver='GeoJSON')
            
            print(f"✓ Successfully converted {shapefile_path} to {output_path}")
            
            # Print basic info about the data
            print(f"  - Features: {len(gdf)}")
            if hasattr(gdf, 'crs') and gdf.crs is not None:
                print(f"  - CRS: {gdf.crs}")
            else:
                print(f"  - CRS: Not defined")
            print(f"  - Columns: {list(gdf.columns)}")
            try:
                bounds = gdf.total_bounds
                print(f"  - Bounds: [{bounds[0]:.6f}, {bounds[1]:.6f}, {bounds[2]:.6f}, {bounds[3]:.6f}]")
            except:
                print(f"  - Bounds: Could not calculate")
            
            return output_path
            
        except Exception as e:
            print(f"✗ Error converting {shapefile_path}: {str(e)}")
            import traceback
            traceback.print_exc()
            return None
    
    def convert_all_shapefiles(self):
        """
        Convert all shapefiles in the input directory
        """
        shapefile_paths = list(self.input_dir.glob("*.shp"))
        
        if not shapefile_paths:
            print("No shapefiles found in the input directory")
            return []
        
        converted_files = []
        for shp_path in shapefile_paths:
            result = self.convert_shapefile_to_geojson(shp_path)
            if result:
                converted_files.append(result)
        
        return converted_files
    
    def create_metadata_file(self, converted_files):
        """
        Create a metadata file with information about converted files
        """
        metadata = {
            "conversion_info": {
                "total_files": len(converted_files),
                "conversion_date": "2025-08-08",
                "files": []
            }
        }
        
        for file_path in converted_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    geojson_data = json.load(f)
                
                file_info = {
                    "filename": file_path.name,
                    "features_count": len(geojson_data.get('features', [])),
                    "type": geojson_data.get('type', 'Unknown')
                }
                
                # Get first feature properties to understand data structure
                if geojson_data.get('features'):
                    first_feature = geojson_data['features'][0]
                    file_info["sample_properties"] = list(first_feature.get('properties', {}).keys())
                
                metadata["conversion_info"]["files"].append(file_info)
                
            except Exception as e:
                print(f"Warning: Could not read metadata for {file_path}: {e}")
        
        # Save metadata
        metadata_path = self.output_dir / 'metadata.json'
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)
        
        print(f"✓ Metadata saved to {metadata_path}")
        return metadata_path

def main():
    # Set paths
    current_dir = Path(__file__).parent
    input_dir = current_dir / 'input_shapefiles'  # Organized shapefiles directory
    output_dir = current_dir / 'geojson_output'
    
    # Debug: Print the actual resolved paths
    print("=== Shapefile to GeoJSON Converter ===")
    print(f"Script location: {Path(__file__).absolute()}")
    print(f"Current directory: {current_dir.absolute()}")  
    print(f"Input directory: {input_dir.absolute()}")
    print(f"Output directory: {output_dir.absolute()}")
    print()
    
    # Initialize converter
    converter = ShapefileConverter(input_dir, output_dir)
    
    # Convert all shapefiles
    converted_files = converter.convert_all_shapefiles()
    
    if converted_files:
        # Create metadata file
        converter.create_metadata_file(converted_files)
        
        print("\n=== Conversion Summary ===")
        print(f"Successfully converted {len(converted_files)} files:")
        for file_path in converted_files:
            print(f"  - {file_path.name}")
    else:
        print("No files were converted successfully.")

if __name__ == "__main__":
    main()
