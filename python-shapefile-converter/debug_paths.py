from pathlib import Path

current_dir = Path(__file__).parent
input_dir = current_dir / 'input_shapefiles'  # Organized shapefiles directory

print(f"Current script directory: {current_dir.absolute()}")
print(f"Input directory: {input_dir.absolute()}")
print(f"Files in input directory:")
for file in input_dir.iterdir():
    print(f"  - {file.name}")

print(f"\nShapefiles in input directory:")
shapefiles = list(input_dir.glob("*.shp"))
for shp in shapefiles:
    print(f"  - {shp.name}")
