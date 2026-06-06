import os
import urllib.request
import tarfile
import subprocess
import shutil

url = "https://github.com/WebAssembly/wabt/releases/download/1.0.41/wabt-1.0.41-windows-x64.tar.gz"
archive_name = "wabt.tar.gz"
wat_file = "noise-generator.wat"
wasm_file = "noise-generator.wasm"
bin_dir = "bin"

try:
    # 1. Download
    print(f"Downloading WABT from {url}...")
    urllib.request.urlretrieve(url, archive_name)
    print("Download complete.")

    # 2. Extract wat2wasm.exe
    print("Extracting wat2wasm.exe...")
    os.makedirs(bin_dir, exist_ok=True)
    wat2wasm_path = None

    with tarfile.open(archive_name, "r:gz") as tar:
        for member in tar.getmembers():
            if member.name.endswith("wat2wasm.exe"):
                # Extract file flattened directly into the bin folder
                member.name = os.path.basename(member.name)
                tar.extract(member, path=bin_dir)
                wat2wasm_path = os.path.join(bin_dir, member.name)
                break

    if not wat2wasm_path or not os.path.exists(wat2wasm_path):
        raise FileNotFoundError("Could not find wat2wasm.exe in the WABT archive.")

    print(f"wat2wasm.exe extracted to {wat2wasm_path}")

    # 3. Compile
    print(f"Compiling {wat_file} to {wasm_file}...")
    result = subprocess.run([wat2wasm_path, wat_file, "-o", wasm_file], capture_output=True, text=True)

    if result.returncode == 0:
        print(f"Successfully compiled WebAssembly! Output saved to: {wasm_file}")
    else:
        print(f"Compilation failed with error:\n{result.stderr}")
        raise RuntimeError("Compilation failed.")

finally:
    # 4. Cleanup
    print("Cleaning up temporary files...")
    if os.path.exists(archive_name):
        os.remove(archive_name)
    if os.path.exists(bin_dir):
        shutil.rmtree(bin_dir)
    print("Cleanup complete.")
