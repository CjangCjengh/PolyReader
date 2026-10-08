"""Check tracked files for local-machine data and credentials before publishing."""
from pathlib import Path
import getpass, io, os, re, subprocess, sys, zipfile

root = Path(__file__).resolve().parents[1]
local_strings = {str(root), root.as_posix(), str(Path.home()), Path.home().as_posix()}
if len(getpass.getuser()) > 4:
    local_strings.add(getpass.getuser())
if os.environ.get('ANDROID_SERIAL'):
    local_strings.add(os.environ['ANDROID_SERIAL'])
needles = {value.encode(encoding).lower() for value in local_strings
           for encoding in ('utf-8', 'utf-16le')}
secret = re.compile(rb'(?:gh[pousr]' + rb'_[A-Za-z0-9]{30,}|github_pat_' + rb'[A-Za-z0-9_]{50,}|sk' + rb'-[A-Za-z0-9._/+=-]{24,})')
issues = []

def inspect(name, data, depth=0):
    folded = data.lower()
    if any(value in folded for value in needles) or secret.search(data):
        issues.append(name)
    if depth < 2 and data.startswith(b'PK\x03\x04'):
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            for entry in archive.infolist():
                if not entry.is_dir():
                    inspect(name + '::' + entry.filename, archive.read(entry), depth + 1)

names = subprocess.check_output(['git', 'ls-files', '-z'], cwd=root).decode().split('\0')
for name in filter(None, names):
    path = root / name
    if path.is_file():
        inspect(name, path.read_bytes())
if issues:
    print('Review files before publishing:\n' + '\n'.join(sorted(set(issues))))
    sys.exit(1)
print('Repository content check passed.')
