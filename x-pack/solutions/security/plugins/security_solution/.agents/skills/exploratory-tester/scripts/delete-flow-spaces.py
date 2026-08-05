#!/usr/bin/env python3
"""
Deletes per-flow Kibana spaces created by create-flow-spaces.py.

Only deletes spaces listed in config.json → created_flow_spaces (spaces that
were created by this session). Spaces that already existed before the session
(i.e. not in that list) are never touched.

Usage:
    python3 scripts/delete-flow-spaces.py --session-dir .exploratory-session/entity-analytics-20260714-093022

Reads:  <session-dir>/config.json
Exit 0: all deletions succeeded (or list was empty).
Exit 1: one or more deletions failed — manual cleanup needed.

Run this at the end of Phase 3, after the knowledge file is committed.
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

spaces_to_delete = cfg.get('created_flow_spaces', [])
if not spaces_to_delete:
    print('No per-flow spaces to clean up.')
    sys.exit(0)

url      = cfg['environment']['url']
creds    = cfg.get('credentials', {})
api_key  = creds.get('api_key')
username = creds.get('username', 'elastic')
password = creds.get('password', 'changeme')

if api_key:
    auth_args = ['-H', f'Authorization: ApiKey {api_key}']
else:
    auth_args = ['-u', f'{username}:{password}']

errors = []

for sid in spaces_to_delete:
    result = subprocess.run(
        ['curl', '-s', '-w', '\n%{http_code}']
        + auth_args +
        ['-X', 'DELETE', f'{url}/api/spaces/space/{sid}',
         '-H', 'kbn-xsrf: true'],
        capture_output=True, text=True
    )

    lines     = result.stdout.rsplit('\n', 1)
    http_code = lines[-1] if len(lines) > 1 else '000'

    if http_code in ('200', '204', '404'):   # 404 = already gone, fine
        status = 'deleted' if http_code in ('200', '204') else 'already gone'
        print(f'Space {sid!r}: {status}')
    else:
        errors.append({'space': sid, 'http_code': http_code})
        print(f'Space {sid!r}: deletion failed (HTTP {http_code}) — manual cleanup needed',
              file=sys.stderr)

if errors:
    print(
        f'\n{len(errors)} space(s) could not be deleted. '
        'Delete them manually via Kibana > Stack Management > Spaces:\n' +
        '\n'.join(e['space'] for e in errors),
        file=sys.stderr
    )
    sys.exit(1)

print(f'\n{len(spaces_to_delete)} per-flow space(s) cleaned up.')
sys.exit(0)
