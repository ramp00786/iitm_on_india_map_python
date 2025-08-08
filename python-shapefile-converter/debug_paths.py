from pathlib import Path

current_dir = Path(__file__).parent
input_dir = current_dir.parent

print(f"Current script directory: {current_dir.absolute()}")
print(f"Parent directory (input): {input_dir.absolute()}")
print(f"Files in parent directory:")
for file in input_dir.iterdir():
    print(f"  - {file.name}")

print(f"\nShapefiles in parent directory:")
shapefiles = list(input_dir.glob("*.shp"))
for shp in shapefiles:
    print(f"  - {shp.name}")
