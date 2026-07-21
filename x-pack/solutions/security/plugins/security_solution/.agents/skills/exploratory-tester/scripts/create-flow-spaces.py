#!/usr/bin/env python3
"""
Creates per-flow Kibana spaces for parallel-mode isolation.

For each flow in config.json where isolate=true (the default), creates a
dedicated Kibana space "exploratory-testing-flow-<N>" and updates the flow's
space_id in config.json. Flows with isolate=false share the base space.

Usage:
    python3 scripts/create-flow-spaces.py --session-dir .exploratory-session/entity-analytics-20260714-093022

Reads:  <session-dir>/config.json
Writes: <session-dir>/config.json  (updates flow.space_id for each flow,
                                    adds created_flow_spaces list)

Exit 0: all spaces created (or already existed).
Exit 1: unrecoverable error — check output for details.

Run this during Phase 1c, while still authenticated as admin.
"""

import argparse
import json
import subprocess
import sys

parser = argparse.ArgumentParser()
parser.add_argument('--session-dir', required=True,
                    help='Path to the session directory (contains config.json)')
args = parser.parse_args()

CONFIG_PATH = f'{args.session_dir}/config.json'

with open(CONFIG_PATH) as f:
    cfg = json.load(f)

if cfg.get('mode') != 'parallel':
    print('Not parallel mode — no per-flow spaces needed.')
    sys.exit(0)

url      = cfg['environment']['url']
base_sid = cfg['environment'].get('space_id', 'exploratory-testing')
creds    = cfg.get('credentials', {})
api_key  = creds.get('api_key')
username = creds.get('username', 'elastic')
password = creds.get('password', 'changeme')

# Build auth args for curl: API key takes precedence over basic auth
if api_key:
    auth_args = ['-H', f'Authorization: ApiKey {api_key}']
else:
    auth_args = ['-u', f'{username}:{password}']

created = []
errors  = []

for i, flow in enumerate(cfg['flows'], 1):
    if not flow.get('isolate', True):
        flow['space_id'] = base_sid
        print(f'Flow {i} ({flow["name"]!r}): isolate=false → sharing {base_sid!r}')
        continue

    sid  = f'exploratory-testing-flow-{i}'
    body = json.dumps({'id': sid, 'name': f'Exploratory Testing — Flow {i}', 'color': '#DD0A73'})

    result = subprocess.run(
        ['curl', '-s', '-w', '\n%{http_code}']
        + auth_args +
        ['-X', 'POST', f'{url}/api/spaces/space',
         '-H', 'kbn-xsrf: true',
         '-H', 'Content-Type: application/json',
         '-d', body],
        capture_output=True, text=True
    )

    lines    = result.stdout.strip().rsplit('\n', 1)
    http_code = lines[-1] if len(lines) > 1 else '000'

    if http_code in ('200', '409'):          # 409 = already exists, reuse
        flow['space_id'] = sid
        created.append(sid)
        status = 'created' if http_code == '200' else 'already exists'
        print(f'Flow {i} ({flow["name"]!r}): space {sid!r} {status}')
    else:
        # Fall back to base space rather than blocking the session
        flow['space_id'] = base_sid
        errors.append({'flow': i, 'space': sid, 'http_code': http_code, 'body': lines[0]})
        print(f'Flow {i} ({flow["name"]!r}): space creation failed (HTTP {http_code}) '
              f'— falling back to shared space {base_sid!r}', file=sys.stderr)

cfg['created_flow_spaces'] = created

with open(CONFIG_PATH, 'w') as f:
    json.dump(cfg, f, indent=2)

print(f'\n{len(created)} per-flow space(s) ready. {len(errors)} fallback(s).')
if errors:
    print('Fallback details:', json.dumps(errors, indent=2), file=sys.stderr)

sys.exit(0)
