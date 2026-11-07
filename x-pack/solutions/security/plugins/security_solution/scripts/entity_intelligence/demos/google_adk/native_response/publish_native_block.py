#!/usr/bin/env python3
"""Publish a verified native Google access denial as evidence for the existing rule.

This does not issue containment commands or write alert documents. Google enforces
access; the native Elastic Workflow changes IAM; this helper joins their evidence.
"""

import argparse
from collections import Counter
import json
from pathlib import Path
import re
import sys
import time
import urllib.parse

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parent / 'app'))
from core import encoded, sha256
sys.path.insert(0, str(ROOT.parent))
from demo_config import PROJECT, require_response_configuration
from setup_native_response import (
    AGENT_ID, BUCKET, CONNECTOR_ID, EVENT_INDEX, IAM_URL, MEMBER, POLICY_ID,
    RESPONSE_PRINCIPAL, ROLE, RULE_IDENTIFIER, RUNTIME, WORKFLOW_ID, Client, save, timestamp,
)

NATIVE_INDEX = 'logs-google_adk.entity_intelligence-default'
BLOCKED_RULE = 'entity-intelligence-export-blocked-v1'
CONTROL_ID = 'ei-google-native-export-containment-v1'
HASH = re.compile(r'^[a-f0-9]{64}$')
HTTP_STEPS = {
    'read_current_export_bucket_iam': 'GET',
    'revoke_agent_export_permission': 'PUT',
    'read_back_google_iam_policy': 'GET',
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def read_json(path):
    require(not path.is_symlink() and path.is_file() and path.stat().st_size <= 4 * 1024 * 1024,
            'Evidence must be a bounded regular JSON file')
    return json.loads(path.read_text())


def field(value, path):
    if path in value:
        return value[path]
    for part in path.split('.'):
        if not isinstance(value, dict):
            return None
        value = value.get(part)
    return value


def safe_id(value):
    require(isinstance(value, str) and re.fullmatch(r'[a-zA-Z0-9_.:-]{1,256}', value), 'Unsafe evidence identifier')
    return urllib.parse.quote(value, safe='')


def target_for(run, call):
    name = f"exports/{run['run_id']}/{sha256(call['id'].encode())[:32]}.json"
    return {'bucket': BUCKET, 'object': name, 'uri': f'gs://{BUCKET}/{name}'}


def validate_run(run):
    require(run.get('status') == 'completed' and run.get('agent', {}).get('provider') == 'google_adk',
            'Require a completed Google ADK run')
    require(run.get('executing_principal', {}).get('email') == RUNTIME, 'Unexpected runtime principal')
    for key in ('run_id', 'session_id'):
        require(re.fullmatch(r'[a-f0-9-]{36}', run.get(key, '')), 'Invalid run or session identity')
    require(re.fullmatch(r'[a-f0-9]{32}', run.get('trace_id', '')), 'Invalid trace identity')
    require(1 <= len(run.get('calls', [])) <= 20, 'Require bounded real native calls')
    require(timestamp(run['completed_at']) >= timestamp(run['started_at']), 'Invalid run chronology')


def validate_call_hashes(call):
    require(call.get('input_sha256') == sha256(encoded(call.get('input'))), 'Native input hash mismatch')
    require(call.get('result_sha256') == sha256(encoded(call.get('result'))), 'Native result hash mismatch')
    require(timestamp(call['completed_at']) >= timestamp(call['started_at']), 'Invalid call chronology')


def validate_denial(run, call, absent, workflow):
    validate_run(run)
    validate_call_hashes(call)
    require(call.get('name') == 'export_case_summary' and call.get('outcome') == 'failure', 'Require a failed export call')
    target = target_for(run, call)
    access = {'status': 'denied', 'provider': 'google_cloud_storage', 'http_status': 403,
              'operation': 'storage.objects.create', 'target': target}
    require(call.get('target') == target and call.get('resource_access') == access,
            'Require native Google HTTP 403 access evidence for the exact export target')
    require(call.get('execution_status') == 'denied_by_provider' and call.get('resource_accessed') == 'denied'
            and 'resource' not in call and 'enforcement' not in call,
            'A gate denial, timeout, or created export is not native Google prevention')
    result = call.get('result', {})
    expected = {'status': 'permission_denied', 'error': 'storage_write_http_403', 'control_status': 'provider_denied',
                'resource_access_status': 'denied', 'provider': 'google_cloud_storage', 'http_status': 403,
                'operation': 'storage.objects.create', 'target_bucket': target['bucket'],
                'target_object': target['object'], 'target_uri': target['uri']}
    require(all(result.get(key) == value for key, value in expected.items()), 'Tool result disagrees with native denial evidence')
    require(timestamp(call['started_at']) >= timestamp(workflow['finishedAt']),
            'The denied export must occur after the native IAM containment workflow completed')
    require(absent.get('tool_call_id') == call['id'] and absent.get('uri') == target['uri'] and absent.get('http_status') == 404
            and timestamp(absent['checked_at']) >= timestamp(call['completed_at']),
            'Require a post-call HTTP 404 check for the exact export target')
    return target


def binding_counter(bindings):
    require(isinstance(bindings, list) and len(bindings) <= 100, 'Unexpected IAM bindings')
    normalized = []
    for binding in bindings:
        require(isinstance(binding, dict) and isinstance(binding.get('role'), str)
                and isinstance(binding.get('members'), list) and all(isinstance(member, str) for member in binding['members']),
                'Malformed IAM binding')
        normalized.append(encoded({**binding, 'members': sorted(binding['members'])}))
    return Counter(normalized)


def remove_runtime_grant(bindings):
    result = []
    for binding in bindings:
        members = [member for member in binding['members'] if not (binding['role'] == ROLE and member == MEMBER)]
        if members:
            result.append({**binding, 'members': members})
    return result


def validate_workflow(containment, connector):
    workflow, alert, source_hit = containment['workflow_execution'], containment['alert'], containment['source_event']
    require(containment.get('bucket') == BUCKET and containment.get('runtime') == RUNTIME
            and containment.get('credential_principal') == RESPONSE_PRINCIPAL, 'Unexpected response scope or configured credential principal')
    require(workflow.get('workflowId') == WORKFLOW_ID and workflow.get('status') == 'completed'
            and workflow.get('triggeredBy') == 'alert' and workflow.get('isTestRun') is False
            and workflow.get('spaceId') == 'default', 'Require a completed native alert-triggered containment workflow')
    safe_id(workflow['id'])
    require(timestamp(workflow['finishedAt']) >= timestamp(workflow['startedAt']), 'Invalid workflow chronology')
    require(connector.get('id') == CONNECTOR_ID and connector.get('connector_type_id') == '.http'
            and connector.get('config', {}).get('url') == IAM_URL, 'Response connector must target the fixed Google export-bucket IAM URL')
    require(source_hit.get('_index') == EVENT_INDEX, 'Unexpected source event index')
    safe_id(source_hit['_id'])
    source = source_hit['_source']
    require(field(source, 'event.action') == 'ai_policy_match' and field(source, 'agent.id') == AGENT_ID
            and field(source, 'agent.type') == 'google_adk', 'Require a real Google policy-match source event')
    require(field(source, 'entity_intelligence.control.id') == POLICY_ID
            and field(source, 'entity_intelligence.control.mode') == 'monitor'
            and field(source, 'entity_intelligence.control.decision') == 'deny'
            and field(source, 'entity_intelligence.invocation.tool_name') == 'read_customer_reference'
            and field(source, 'entity_intelligence.invocation.runtime_principal') == RUNTIME,
            'Containment must originate from the saved restricted-lookup policy')
    require(timestamp(source['@timestamp']) <= timestamp(workflow['startedAt']), 'Source detection cannot follow the response')
    require(re.fullmatch(r'\.internal\.alerts-security\.alerts-default-[0-9]{6}', alert.get('_index', '')),
            'Unexpected native alert index')
    safe_id(alert['_id'])
    alert_source = alert['_source']
    require(field(alert_source, 'kibana.alert.rule.rule_id') == RULE_IDENTIFIER, 'Wrong containment detection rule')
    require(any(ancestor.get('index') == EVENT_INDEX and ancestor.get('id') == source_hit['_id']
                for ancestor in field(alert_source, 'kibana.alert.ancestors') or []), 'Native alert must descend from the exact policy event')
    for path in ('entity_intelligence.control.id', 'entity_intelligence.invocation.observation_id',
                 'entity_intelligence.invocation.observation_index', 'entity_intelligence.invocation.tool_call_id',
                 'entity_intelligence.invocation.runtime_principal', 'agent.id', 'session.id'):
        require(field(alert_source, path) == field(source, path), 'Alert/source identity mismatch')
    trigger = workflow.get('context', workflow.get('input', {})).get('event', {})
    require(trigger.get('rule', {}).get('id') == field(alert_source, 'kibana.alert.rule.uuid')
            and any(item.get('_id') == alert['_id'] for item in trigger.get('alerts', [])),
            'Workflow trigger does not contain the native containment alert')
    definitions = workflow.get('workflowDefinition', {}).get('steps', [])
    completed = {}
    for step_id, method in HTTP_STEPS.items():
        snapshots = [item for item in definitions if item.get('name') == step_id]
        require(len(snapshots) == 1 and snapshots[0].get('type') == 'http'
                and snapshots[0].get('connector-id') == CONNECTOR_ID
                and snapshots[0].get('with', {}).get('method') == method,
                'Execution snapshot does not bind the expected Google HTTP connector')
        matches = [step for step in workflow.get('stepExecutions', []) if step.get('stepId') == step_id]
        require(len(matches) == 1, 'Require one execution of each Google IAM HTTP step')
        step = matches[0]
        require(step.get('stepType') == 'http' and step.get('status') == 'completed'
                and step.get('workflowRunId') == workflow['id'] and step.get('workflowId') == WORKFLOW_ID
                and step.get('spaceId') == 'default' and step.get('isTestRun') is False,
                'Require completed real HTTP steps from this workflow execution')
        require(step.get('input', {}).get('method') == method and step.get('output', {}).get('status') == 200,
                'Require Google HTTP 200 for each IAM operation')
        require(timestamp(step['finishedAt']) >= timestamp(step['startedAt'])
                and timestamp(step['startedAt']) >= timestamp(workflow['startedAt'])
                and timestamp(step['finishedAt']) <= timestamp(workflow['finishedAt']), 'Invalid IAM step chronology')
        completed[step_id] = step
    before_step, change, after_step = [completed[key] for key in HTTP_STEPS]
    require(timestamp(before_step['finishedAt']) <= timestamp(change['startedAt'])
            and timestamp(change['finishedAt']) <= timestamp(after_step['startedAt']), 'IAM operations were not ordered read/change/readback')
    before, changed, after = [step['output']['data'] for step in (before_step, change, after_step)]
    require(any(binding['role'] == ROLE and MEMBER in binding['members'] for binding in before.get('bindings', [])),
            'The runtime must have export permission before this workflow action')
    expected = binding_counter(remove_runtime_grant(before['bindings']))
    require(binding_counter(changed.get('bindings')) == expected and binding_counter(after.get('bindings')) == expected,
            'Google IAM response/readback must remove only the runtime export membership')
    body = change['input'].get('body')
    body = json.loads(body) if isinstance(body, str) else body
    require(isinstance(body, dict) and isinstance(before.get('etag'), str) and before['etag']
            and body.get('etag') == before['etag'] and binding_counter(body.get('bindings')) == expected,
            'Workflow must use the current etag and preserve other IAM bindings')
    require(isinstance(after.get('etag'), str) and after['etag'], 'IAM readback must carry a Google policy etag')
    return workflow


def validate_baseline(baseline, workflow):
    run = baseline['response']
    validate_run(run)
    require(timestamp(run['completed_at']) <= timestamp(workflow['startedAt']), 'Baseline must precede the containment workflow')
    candidates = [call for call in run['calls'] if call.get('name') == 'export_case_summary' and call.get('outcome') == 'success']
    require(len(candidates) == 1, 'Require one successful baseline export')
    call = candidates[0]
    validate_call_hashes(call)
    target = target_for(run, call)
    resource = call.get('resource', {})
    require('enforcement' not in call and resource.get('uri') == target['uri'] and resource.get('operation') == 'created'
            and re.fullmatch(r'[0-9]+', resource.get('generation', '')) and HASH.fullmatch(resource.get('sha256', '')),
            'Baseline must contain an actual created export under the same service account and bucket')
    require(call.get('result', {}).get('status') == 'exported' and call['result'].get('uri') == target['uri'],
            'Baseline result must agree with the created export')
    return run, call


def validate_imported(run, call, hit):
    require(hit.get('_index') == NATIVE_INDEX and isinstance(hit.get('_id'), str), 'Unexpected native observation source')
    source = hit['_source']
    require(field(source, 'agent.id') == AGENT_ID and field(source, 'agent.type') == 'google_adk'
            and field(source, 'session.id') == run['session_id'], 'Imported identity/session mismatch')
    require(field(source, 'event.action') == 'tool_call' and field(source, 'event.outcome') == call['outcome']
            and field(source, 'tool.name') == call['name'] and field(source, 'tool.call.id') == call['id'], 'Imported tool differs from native call')
    native = source.get('source', {})
    require(native.get('kind') == 'google_adk_cloud_run' and native.get('observation_type') == 'native_tool_completion'
            and native.get('native_event_id') == call['evidence_id'] and native.get('input_sha256') == call['input_sha256']
            and native.get('result_sha256') == call['result_sha256'] and HASH.fullmatch(native.get('record_hash', '')),
            'Imported native evidence/hash mismatch')
    cloud = source.get('google_adk', {})
    require(cloud.get('run_id') == run['run_id'] and cloud.get('trace_id') == run['trace_id']
            and cloud.get('runtime', {}).get('email') == RUNTIME, 'Imported runtime/run evidence mismatch')
    actor = cloud.get('requester', {})
    require(actor.get('subject') == run['requester']['subject'] and actor.get('email') == run['requester']['email']
            and actor.get('authenticated') is True and actor.get('provenance') == 'google_signed_id_token_verified_by_application',
            'Imported requester evidence mismatch')
    for direction, expected_hash, expected_value in (('input', call['input_sha256'], call['input']), ('output', call['result_sha256'], call['result'])):
        content = source.get('content', {}).get(direction, {})
        expected_source = 'google_adk.function_call.' + ('arguments' if direction == 'input' else 'result')
        require(isinstance(content.get('text'), str) and len(content['text']) <= 32000
                and content.get('source') == expected_source and content.get('recordHash') == expected_hash
                and type(content.get('redacted')) is bool and type(content.get('truncated')) is bool, 'Missing bounded native tool content')
        if not content['redacted'] and not content['truncated']:
            require(json.loads(content['text']) == expected_value, 'Visible imported tool content differs')
    return actor


def make_event(run, call, receipt, hit, connector):
    containment = receipt['containment']
    workflow = validate_workflow(containment, connector)
    baseline_run, baseline_call = validate_baseline(receipt['baseline'], workflow)
    require(baseline_run['session_id'] != run['session_id'], 'Baseline and denied export must be separate real sessions')
    absent = [item for item in receipt.get('physical_output_absent', []) if item.get('tool_call_id') == call['id']]
    require(len(absent) == 1, 'Require one exact target absence receipt')
    target = validate_denial(run, call, absent[0], workflow)
    actor = validate_imported(run, call, hit)
    source = hit['_source']
    native = source['source']
    content = source['content']['input']
    source_event = containment['source_event']
    lookup_session = field(source_event['_source'], 'session.id')
    require(lookup_session != run['session_id'], 'The triggering customer lookup must remain distinct from the later denied export session')
    clause = {'id': 'revoke-google-agent-export-after-restricted-lookup', 'name': 'Contain exports after restricted customer access',
              'condition': 'A saved restricted-customer-lookup policy match triggers Elastic Workflows to remove the runtime service account from the export bucket objectCreator role. A later real export receives Google Storage HTTP 403.',
              'expected': 'deny'}
    definition = {'policy_id': CONTROL_ID, 'policy_version': 1,
                  'description': f'After a customer-reference lookup matches saved AI policy {POLICY_ID}, remove this agent runtime export permission through Google Storage IAM.',
                  'scope': f'Google ADK customer_support_agent runtime in {PROJECT}, dedicated export bucket only. This contains later writes; it does not prevent or undo the triggering lookup. IAM changes are eventually consistent.',
                  'clauses': [clause]}
    event_id = sha256(encoded(['default', CONTROL_ID, 1, workflow['id'], hit['_index'], hit['_id']]))
    reason = (f"Elastic Workflow {WORKFLOW_ID}, execution {workflow['id']}, was triggered by lookup alert {containment['alert']['_id']} "
              f"in session {lookup_session}. Its native HTTP steps removed {ROLE} for {RUNTIME} from {BUCKET}, with Google HTTP 200 and IAM readback. "
              f"This later export call received Google Storage HTTP 403; its exact target returned HTTP 404 at {absent[0]['checked_at']}. "
              f"A prior export in session {baseline_run['session_id']} succeeded. The triggering lookup was not blocked. "
              'Denial evidence comes from the application-recorded Google response and object check; an independently joined Cloud Audit denial is not asserted.')
    return {'@timestamp': call['completed_at'],
            'event': {'id': event_id, 'kind': 'event', 'dataset': 'entity_intelligence.security', 'action': 'ai_tool_prevented',
                      'category': ['network'], 'type': ['access', 'denied'], 'outcome': 'failure'},
            'user': {'id': actor['subject'], 'name': actor['email']},
            'agent': {'id': AGENT_ID, 'name': 'Google ADK', 'type': 'google_adk'}, 'session': {'id': run['session_id']},
            'trace': {'id': run['trace_id']}, 'kibana': {'space_id': 'default'},
            'entity_intelligence': {
                'schema_version': 1,
                'actor_provenance': 'authenticated_user' if actor.get('principal_type') == 'google_account' else 'source_identity',
                'agent': {'id': AGENT_ID, 'name': 'Google ADK', 'provider': 'google_adk', 'session_id': run['session_id']},
                'request_id': call['evidence_id'], 'activity': {'type': 'unapproved_export', 'target': target['uri']},
                'control': {'id': CONTROL_ID, 'name': 'Google native export containment', 'version': '1',
                            'engine': 'elastic_workflows.google_storage_iam', 'mode': 'enforce', 'decision': 'deny', 'outcome': 'blocked', 'severity': 'high',
                            'reason': reason, 'clause': clause, 'policy_sha256': sha256(encoded(definition)), 'definition': definition},
                'invocation': {'request_id': call['evidence_id'], 'runtime_principal': RUNTIME, 'operation_outcome': 'failure',
                               'tool_call_id': call['id'], 'tool_name': call['name'], 'trace_id': run['trace_id'], 'span_id': call['span_id'],
                               'actor_source': actor['provenance'], 'observation_index': hit['_index'], 'observation_id': hit['_id'],
                               'input_record_hash': native['record_hash'], 'input_source': content['source'], 'correlation': 'exact_native_observation',
                               'input': content['text'], 'input_redacted': content['redacted'], 'input_truncated': content['truncated']}}}


def find_native(es, run, call):
    response = es.request('POST', '/' + NATIVE_INDEX + '/_search', {'size': 2, 'query': {'bool': {'filter': [
        {'term': {'agent.id': AGENT_ID}}, {'term': {'session.id': run['session_id']}},
        {'term': {'tool.call.id': call['id']}}, {'term': {'event.action': 'tool_call'}}]}}})
    hits = response['hits']['hits']
    require(len(hits) == 1, 'Sync first: exact native tool observation missing or ambiguous')
    validate_imported(run, call, hits[0])
    return hits[0]


def refresh_evidence(receipt, es, kibana):
    containment = receipt['containment']
    require(re.fullmatch(r'\.internal\.alerts-security\.alerts-default-[0-9]{6}', containment['alert'].get('_index', '')),
            'Unexpected native alert index')
    require(containment['source_event'].get('_index') == EVENT_INDEX, 'Unexpected source event index')
    workflow_id = safe_id(containment['workflow_execution']['id'])
    actual_workflow = kibana.request('GET', '/api/workflows/executions/' + workflow_id + '?includeInput=true&includeOutput=true')
    actual_alert = es.request('GET', '/' + containment['alert']['_index'] + '/_doc/' + safe_id(containment['alert']['_id']))
    actual_source = es.request('GET', '/' + EVENT_INDEX + '/_doc/' + safe_id(containment['source_event']['_id']))
    require(actual_alert['_source'] == containment['alert']['_source'] and actual_source['_source'] == containment['source_event']['_source'],
            'Saved alert/source differs from the actual Elastic evidence')
    containment = {**containment, 'workflow_execution': actual_workflow, 'alert': actual_alert, 'source_event': actual_source}
    connector = kibana.request('GET', '/api/actions/connector/' + CONNECTOR_ID)
    validate_workflow(containment, connector)
    lookup = actual_source['_source']['entity_intelligence']['invocation']
    require(lookup.get('observation_index') == NATIVE_INDEX and lookup.get('correlation') == 'exact_native_observation',
            'Triggering lookup must reference an exact native observation')
    lookup_hit = es.request('GET', '/' + NATIVE_INDEX + '/_doc/' + safe_id(lookup['observation_id']))
    lookup_source = lookup_hit['_source']
    require(field(lookup_source, 'tool.name') == 'read_customer_reference'
            and field(lookup_source, 'tool.call.id') == lookup['tool_call_id']
            and field(lookup_source, 'agent.id') == AGENT_ID
            and field(lookup_source, 'google_adk.runtime.email') == RUNTIME
            and field(lookup_source, 'session.id') == field(actual_source['_source'], 'session.id')
            and field(lookup_source, 'source.record_hash') == lookup.get('input_record_hash'), 'Triggering lookup differs from imported native evidence')
    return {**receipt, 'containment': containment}, connector


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run', type=Path, required=True)
    parser.add_argument('--receipt', type=Path, required=True)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--skip-run-soon', action='store_true')
    parser.add_argument('--wait-seconds', type=int, default=30)
    parser.add_argument('--kibana-url', default='http://127.0.0.1:5601')
    parser.add_argument('--es-url', default='http://127.0.0.1:9200')
    args = parser.parse_args()
    require_response_configuration()
    require(0 <= args.wait_seconds <= 60, 'Alert wait must be between 0 and 60 seconds')
    envelope, receipt = read_json(args.run), read_json(args.receipt)
    run = envelope.get('response', envelope)
    require(receipt.get('response') == run, 'Receipt response differs from saved native run')
    es, kibana = Client(args.es_url), Client(args.kibana_url)
    receipt, connector = refresh_evidence(receipt, es, kibana)
    baseline_run, baseline_call = validate_baseline(receipt['baseline'], receipt['containment']['workflow_execution'])
    find_native(es, baseline_run, baseline_call)
    calls = [call for call in run.get('calls', []) if call.get('resource_access', {}).get('status') == 'denied']
    require(1 <= len(calls) <= 20, 'Require native denied export calls')
    events = [make_event(run, call, receipt, find_native(es, run, call), connector) for call in calls]
    rule = kibana.request('GET', '/api/detection_engine/rules?rule_id=' + BLOCKED_RULE)
    require(rule.get('rule_id') == BLOCKED_RULE and rule.get('enabled') is True, 'Existing export-blocked rule must be enabled')
    report = {'run_id': run['run_id'], 'session_id': run['session_id'], 'source_index': EVENT_INDEX,
              'source_event_ids': [event['event']['id'] for event in events], 'dry_run': args.dry_run,
              'created': 0, 'already_present': 0, 'alerts': [], 'workflow_execution_id': receipt['containment']['workflow_execution']['id'],
              'proof': 'native_workflow_google_iam_change_then_application_recorded_google403_and_target404',
              'independent_cloud_audit_denial_joined': False}
    if not args.dry_run:
        for event in events:
            event_id = event['event']['id']
            existing = es.request('GET', '/' + EVENT_INDEX + '/_doc/' + event_id, missing_ok=True)
            if existing:
                require(existing['_source'] == event, 'Existing immutable source event differs')
                report['already_present'] += 1
            else:
                es.request('PUT', '/' + EVENT_INDEX + '/_create/' + event_id + '?refresh=wait_for', event)
                report['created'] += 1
        if not args.skip_run_soon:
            kibana.request('POST', '/internal/alerting/rule/' + safe_id(rule['id']) + '/_run_soon', {}, '1')
        deadline = time.monotonic() + args.wait_seconds
        while True:
            result = es.request('POST', '/.alerts-security.alerts-default/_search', {'size': 20, '_source': ['kibana.alert.rule.name', 'kibana.alert.ancestors'],
                                'query': {'bool': {'filter': [{'term': {'kibana.alert.rule.rule_id': BLOCKED_RULE}},
                                                               {'terms': {'kibana.alert.ancestors.id': report['source_event_ids']}}]}}})
            report['alerts'] = [{'id': hit['_id'], 'index': hit['_index']} for hit in result['hits']['hits']]
            if len(report['alerts']) >= len(events) or time.monotonic() >= deadline:
                break
            time.sleep(min(2, max(0, deadline - time.monotonic())))
    if args.output:
        save(args.output, report)
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    try:
        main()
    except (ValueError, RuntimeError) as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(1)
