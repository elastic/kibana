#!/usr/bin/env python3
"""Install a native Elastic Workflow that changes the isolated Google bucket's IAM."""

import argparse
import base64
import datetime as dt
import json
import os
from pathlib import Path
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parent
WORKFLOW_ID = 'workflow-ei-google-native-containment-v1'
RESTORE_WORKFLOW_ID = 'workflow-ei-google-restore-export-v1'
CONNECTOR_ID = 'ei-google-storage-iam-response-v1'
CONNECTOR_NAME = 'Google Storage IAM — Entity Intelligence demo response'
RULE_IDENTIFIER = 'entity-intelligence-google-native-containment-v1'
sys.path.insert(0, str(ROOT.parent))
from demo_config import PROJECT, AGENT_ID, POLICY_ID, RUNTIME, RESPONSE_PRINCIPAL, require_response_configuration
MEMBER = 'serviceAccount:' + RUNTIME
BUCKET = f'{PROJECT}-ei-agent-demo-export'
ROLE = 'roles/storage.objectCreator'
IAM_URL = 'https://storage.googleapis.com/storage/v1/b/' + BUCKET + '/iam'
EVENT_INDEX = 'logs-entity_intelligence.security-default'
MANAGED_BY = 'entity-intelligence-google-native-response'


def workflow_yaml(name):
    return (ROOT / f'{name}.yaml').read_text().replace('example-ei-project', PROJECT)


def now():
    return dt.datetime.now(dt.timezone.utc).isoformat().replace('+00:00', 'Z')


def timestamp(value):
    parsed = dt.datetime.fromisoformat(value.replace('Z', '+00:00'))
    if parsed.tzinfo is None:
        raise ValueError('Timestamp must include a timezone')
    return parsed.astimezone(dt.timezone.utc)


def save(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n')
    path.chmod(0o600)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, new_url):
        return None


class Client:
    def __init__(self, base='http://127.0.0.1:5601'):
        self.base = base.rstrip('/')
        parsed = urllib.parse.urlsplit(self.base)
        if parsed.scheme != 'http' or parsed.hostname not in ('127.0.0.1', 'localhost') or parsed.username or parsed.password or parsed.path:
            raise ValueError('Only the local demonstration Kibana is supported')
        credentials = ':'.join((os.environ.get('EI_ELASTIC_USERNAME', 'elastic'), os.environ.get('EI_ELASTIC_PASSWORD', 'changeme')))
        self.auth = 'Basic ' + base64.b64encode(credentials.encode()).decode()
        self.opener = urllib.request.build_opener(NoRedirect())

    def request(self, method, path, body=None, version=None, missing_ok=False):
        if not path.startswith('/') or path.startswith('//'):
            raise ValueError('Expected local absolute API path')
        headers = {'Authorization': self.auth, 'kbn-xsrf': MANAGED_BY, 'Content-Type': 'application/json', 'x-elastic-internal-origin': MANAGED_BY}
        if version:
            headers['elastic-api-version'] = version
        request = urllib.request.Request(self.base + path, data=json.dumps(body).encode() if body is not None else None, headers=headers, method=method)
        try:
            with self.opener.open(request, timeout=45) as response:
                raw = response.read(4 * 1024 * 1024 + 1)
                if len(raw) > 4 * 1024 * 1024:
                    raise RuntimeError('Kibana response exceeded the size limit')
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as error:
            if missing_ok and error.code == 404:
                return None
            # Connector requests contain credentials. Never echo request/response bodies.
            raise RuntimeError(f'{method} {path}: HTTP {error.code}') from None
        except urllib.error.URLError:
            raise RuntimeError('Local Kibana did not return a usable response') from None


def token_secret(token, principal, expires_at):
    if principal != RESPONSE_PRINCIPAL:
        raise ValueError('Use the dedicated, bucket-scoped response service account')
    remaining = (timestamp(expires_at) - dt.datetime.now(dt.timezone.utc)).total_seconds()
    if not 120 <= remaining <= 3600:
        raise ValueError('Token must expire in 2–60 minutes')
    if not re.fullmatch(r'[A-Za-z0-9_.~+/-]{30,16384}={0,2}', token):
        raise ValueError('Expected one short-lived OAuth access token')
    return {'secretHeaders': {'Authorization': 'Bearer ' + token}}


def connector_definition(token, principal, expires_at):
    return {'name': CONNECTOR_NAME, 'connector_type_id': '.http',
            'config': {'url': IAM_URL, 'hasAuth': False, 'authType': None, 'headers': {'Content-Type': 'application/json'}},
            'secrets': token_secret(token, principal, expires_at)}


def rule_definition(activation):
    timestamp(activation)
    query = ' and '.join([
        'event.action: "ai_policy_match"', f'agent.id: "{AGENT_ID}"', 'agent.type: "google_adk"',
        f'entity_intelligence.control.id: "{POLICY_ID}"',
        'entity_intelligence.control.mode: "monitor"', 'entity_intelligence.control.decision: "deny"',
        'entity_intelligence.invocation.tool_name: "read_customer_reference"',
        f'entity_intelligence.invocation.runtime_principal: "{RUNTIME}"', f'@timestamp >= "{activation}"',
    ])
    return {'rule_id': RULE_IDENTIFIER, 'name': 'Google agent restricted customer lookup — revoke export access',
            'description': 'A recorded customer-reference tool call matched the saved Entity Intelligence policy. Trigger a native Elastic Workflow that calls Google Storage IAM to remove export permission from this one demo runtime. Detection is retrospective; Google IAM propagation is verified separately with a real write attempt.',
            'type': 'query', 'language': 'kuery', 'index': [EVENT_INDEX], 'query': query,
            'severity': 'high', 'risk_score': 73, 'interval': '1m', 'from': 'now-10m', 'to': 'now',
            'enabled': True, 'max_signals': 20, 'tags': ['Entity Intelligence', 'Google ADK', 'Native response'],
            'author': ['Entity Intelligence'],
            'false_positives': ['Authorized customer-reference reads also match the narrow demo policy; a match alone does not establish malicious intent.'],
            'note': 'The response removes roles/storage.objectCreator for the exact runtime on the dedicated export bucket. Inspect the Workflow HTTP steps for Google API responses. A successful IAM update is not proof of data-plane enforcement: verify the subsequent real agent tool receives storage.objects.create HTTP 403. No claim is made that the triggering read was prevented.',
            'actions': [{'id': 'system-connector-.workflows', 'action_type_id': '.workflows', 'params': {'subAction': 'run', 'subActionParams': {'workflowId': WORKFLOW_ID, 'summaryMode': False, 'alertStates': {'new': True, 'ongoing': False, 'recovered': False}}}}]}


def read_state():
    path = ROOT / 'state.json'
    return json.loads(path.read_text()) if path.exists() else {}


def verify_state(state):
    if state and (state.get('managed_by') != MANAGED_BY or state.get('connector_id') != CONNECTOR_ID):
        raise ValueError('Unexpected native response state; refusing to overwrite')


def install_connector(client, token, principal, expires_at):
    path = '/api/actions/connector/' + CONNECTOR_ID
    existing = client.request('GET', path, missing_ok=True)
    definition = connector_definition(token, principal, expires_at)
    if existing:
        if existing.get('name') != CONNECTOR_NAME or existing.get('connector_type_id') != '.http' or existing.get('config', {}).get('url') != IAM_URL:
            raise ValueError('Connector ID belongs to an unexpected resource')
        definition.pop('connector_type_id')
        result = client.request('PUT', path, definition)
    else:
        result = client.request('POST', path, definition)
    if result.get('is_missing_secrets'):
        raise RuntimeError('Connector was saved without usable secrets')
    return result


def validate(client):
    result = {}
    for name in ('containment', 'restore'):
        validation = client.request('POST', '/api/workflows/validate', {'yaml': workflow_yaml(name)}, '1')
        save(ROOT / f'{name}-validation.json', validation)
        result[name] = validation
        if not validation.get('valid'):
            raise RuntimeError(f'{name} YAML failed validation: ' + json.dumps(validation))
    return result


def install(client, token, principal, expires_at):
    state = read_state()
    verify_state(state)
    activation = state.get('activated_at') or now()
    install_connector(client, token, principal, expires_at)
    validate(client)
    for workflow_id, filename in [(WORKFLOW_ID, 'containment'), (RESTORE_WORKFLOW_ID, 'restore')]:
        yaml = workflow_yaml(filename)
        path = '/api/workflows/workflow/' + workflow_id
        existing = client.request('GET', path, missing_ok=True)
        if existing and 'Native Google response' not in existing.get('tags', []):
            raise ValueError('Workflow ID belongs to an unexpected resource')
        workflow = client.request('PUT', path, {'yaml': yaml}) if existing else client.request('POST', '/api/workflows/workflow', {'id': workflow_id, 'yaml': yaml})
        if not workflow.get('valid') or not workflow.get('enabled'):
            raise RuntimeError('Saved Workflow is not enabled and valid')
        save(ROOT / (filename + '-workflow.json'), workflow)
    rule_path = '/api/detection_engine/rules?rule_id=' + RULE_IDENTIFIER
    existing_rule = client.request('GET', rule_path, missing_ok=True)
    definition = rule_definition(activation)
    rule = client.request('PUT' if existing_rule else 'POST', '/api/detection_engine/rules', definition)
    state = {'managed_by': MANAGED_BY, 'activated_at': activation, 'workflow_id': WORKFLOW_ID,
             'restore_workflow_id': RESTORE_WORKFLOW_ID, 'connector_id': CONNECTOR_ID,
             'rule_id': rule['id'], 'rule_identifier': RULE_IDENTIFIER, 'policy_id': POLICY_ID,
             'agent_id': AGENT_ID, 'runtime_principal': RUNTIME, 'response_principal': principal,
             'bucket': BUCKET, 'role': ROLE, 'event_index': EVENT_INDEX, 'token_expires_at': expires_at,
             'kibana_url': client.base, 'workflow_url': client.base + '/app/workflows/' + WORKFLOW_ID,
             'restore_workflow_url': client.base + '/app/workflows/' + RESTORE_WORKFLOW_ID,
             'rule_url': client.base + '/app/security/rules/id/' + rule['id'], 'updated_at': now()}
    save(ROOT / 'state.json', state)
    save(ROOT / 'rule.json', rule)
    return state


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['install', 'refresh-token', 'validate', 'status', 'run-soon', 'restore', 'disable'])
    parser.add_argument('--kibana-url', default='http://127.0.0.1:5601')
    parser.add_argument('--token-stdin', action='store_true')
    parser.add_argument('--principal', default=RESPONSE_PRINCIPAL)
    parser.add_argument('--expires-at')
    args = parser.parse_args()
    require_response_configuration()
    client = Client(args.kibana_url)
    if args.command in ('install', 'refresh-token'):
        if not args.token_stdin or not args.expires_at:
            raise ValueError('Supply --token-stdin and --expires-at; never pass access tokens in arguments')
        token = sys.stdin.read(16386).strip()
        if args.command == 'install':
            result = install(client, token, args.principal, args.expires_at)
        else:
            state = read_state()
            verify_state(state)
            if not state:
                raise ValueError('Install native response first')
            install_connector(client, token, args.principal, args.expires_at)
            state.update({'token_expires_at': args.expires_at, 'updated_at': now()})
            save(ROOT / 'state.json', state)
            result = {'connector_id': CONNECTOR_ID, 'token_expires_at': args.expires_at, 'activated_at': state['activated_at']}
        token = None
    elif args.command == 'validate':
        result = validate(client)
    else:
        state = read_state()
        verify_state(state)
        if not state:
            raise ValueError('Install native response first')
        if args.command == 'run-soon':
            result = client.request('POST', f'/internal/alerting/rule/{state["rule_id"]}/_run_soon', {}, '1')
        elif args.command == 'restore':
            result = client.request('POST', '/api/workflows/workflow/' + RESTORE_WORKFLOW_ID + '/run', {'inputs': {}})
        elif args.command == 'disable':
            client.request('PATCH', '/api/detection_engine/rules', {'id': state['rule_id'], 'enabled': False})
            client.request('PUT', '/api/workflows/workflow/' + WORKFLOW_ID, {'enabled': False})
            result = {'enabled': False, 'access_restored': False}
        else:
            rule = client.request('GET', '/api/detection_engine/rules?rule_id=' + RULE_IDENTIFIER)
            workflow = client.request('GET', '/api/workflows/workflow/' + WORKFLOW_ID)
            connector = client.request('GET', '/api/actions/connector/' + CONNECTOR_ID)
            result = {'rule': {key: rule.get(key) for key in ('id', 'enabled', 'execution_summary')},
                      'workflow': {key: workflow.get(key) for key in ('id', 'name', 'enabled', 'valid')},
                      'connector': {key: connector.get(key) for key in ('id', 'name', 'connector_type_id', 'is_missing_secrets')},
                      'token_expires_at': state.get('token_expires_at'), 'activated_at': state['activated_at']}
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    try:
        main()
    except (ValueError, RuntimeError) as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(1)
