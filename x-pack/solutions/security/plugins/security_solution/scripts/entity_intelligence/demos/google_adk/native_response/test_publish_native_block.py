import copy
import json
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
from publish_native_block import (
    AGENT_ID, BUCKET, CONNECTOR_ID, EVENT_INDEX, HTTP_STEPS, IAM_URL, MEMBER, NATIVE_INDEX,
    POLICY_ID, RESPONSE_PRINCIPAL, ROLE, RULE_IDENTIFIER, RUNTIME, WORKFLOW_ID,
    encoded, make_event, sha256, validate_baseline, validate_denial, validate_workflow,
)


def at(second):
    return f'2026-10-14T12:00:{second:02d}Z'


def run_fixture(denied=True):
    run_id = '11111111-1111-4111-8111-111111111111' if denied else '22222222-2222-4222-8222-222222222222'
    session_id = '33333333-3333-4333-8333-333333333333' if denied else '44444444-4444-4444-8444-444444444444'
    name = f"exports/{run_id}/{sha256(b'export-call')[:32]}.json"
    target = {'bucket': BUCKET, 'object': name, 'uri': f'gs://{BUCKET}/{name}'}
    result = {'status': 'permission_denied', 'error': 'storage_write_http_403', 'control_status': 'provider_denied',
              'resource_access_status': 'denied', 'provider': 'google_cloud_storage', 'http_status': 403,
              'operation': 'storage.objects.create', 'target_bucket': BUCKET, 'target_object': name, 'target_uri': target['uri']}
    call = {'id': 'export-call', 'evidence_id': '55555555-5555-4555-8555-555555555555', 'name': 'export_case_summary',
            'outcome': 'failure', 'execution_status': 'denied_by_provider', 'resource_accessed': 'denied',
            'resource_access': {'status': 'denied', 'provider': 'google_cloud_storage', 'http_status': 403, 'operation': 'storage.objects.create', 'target': target},
            'target': target, 'input': {'summary': 'Example customer reference DEMO-001'},
            'result': result, 'started_at': at(20), 'completed_at': at(21), 'span_id': 'b' * 16}
    if not denied:
        resource = {'uri': target['uri'], 'generation': '123456', 'sha256': 'd' * 64, 'operation': 'created'}
        call = {key: value for key, value in call.items() if key not in {'resource_access', 'resource_accessed', 'execution_status'}}
        call.update(outcome='success', result={'status': 'exported', **resource}, resource=resource, started_at=at(1), completed_at=at(2))
    call['input_sha256'] = sha256(encoded(call['input']))
    call['result_sha256'] = sha256(encoded(call['result']))
    actor = {'subject': 'requester-id', 'email': 'operator@example.com', 'authenticated': True,
             'principal_type': 'google_account', 'provenance': 'google_signed_id_token_verified_by_application'}
    run = {'status': 'completed', 'run_id': run_id, 'session_id': session_id, 'trace_id': 'a' * 32,
           'agent': {'provider': 'google_adk'}, 'requester': actor, 'executing_principal': {'email': RUNTIME},
           'started_at': at(19 if denied else 0), 'completed_at': at(22 if denied else 3), 'calls': [call]}
    return run


def fixture():
    run, baseline = run_fixture(), run_fixture(False)
    call = run['calls'][0]
    source = {'_index': EVENT_INDEX, '_id': 'lookup-source', '_source': {
        '@timestamp': at(4), 'event': {'action': 'ai_policy_match'}, 'agent': {'id': AGENT_ID, 'type': 'google_adk'},
        'session': {'id': 'lookup-session'}, 'entity_intelligence': {
            'control': {'id': POLICY_ID, 'mode': 'monitor', 'decision': 'deny'},
            'invocation': {'tool_name': 'read_customer_reference', 'runtime_principal': RUNTIME,
                           'observation_index': NATIVE_INDEX, 'observation_id': 'native-lookup', 'tool_call_id': 'lookup-call'}}}}
    alert_source = {**copy.deepcopy(source['_source']), 'kibana.alert.rule.rule_id': RULE_IDENTIFIER,
                    'kibana.alert.rule.uuid': 'native-response-rule', 'kibana.alert.ancestors': [{'index': EVENT_INDEX, 'id': source['_id']}]}
    alert = {'_index': '.internal.alerts-security.alerts-default-000001', '_id': 'lookup-alert', '_source': alert_source}
    bindings = [{'role': ROLE, 'members': [MEMBER, 'serviceAccount:other@example.iam.gserviceaccount.com']},
                {'role': 'roles/storage.legacyBucketOwner', 'members': ['projectOwner:example-ei-project']},
                {'role': 'projects/example-ei-project/roles/eiAgentDemoBucketResponse', 'members': ['serviceAccount:' + RESPONSE_PRINCIPAL]}]
    before = {'etag': 'before-etag', 'version': 1, 'bindings': bindings}
    after = {'etag': 'after-etag', 'version': 1, 'bindings': copy.deepcopy(bindings)}
    after['bindings'][0]['members'].remove(MEMBER)
    body = {**after, 'etag': before['etag']}
    steps = []
    definitions = []
    for index, (step_id, method) in enumerate(HTTP_STEPS.items()):
        definitions.append({'name': step_id, 'type': 'http', 'connector-id': CONNECTOR_ID, 'with': {'method': method}})
        step = {'stepId': step_id, 'stepType': 'http', 'status': 'completed', 'workflowRunId': 'execution-native',
                'workflowId': WORKFLOW_ID, 'spaceId': 'default', 'isTestRun': False,
                'startedAt': at(6 + index * 2), 'finishedAt': at(7 + index * 2),
                'input': {'method': method}, 'output': {'status': 200, 'data': copy.deepcopy(before if index == 0 else after)}}
        if method == 'PUT':
            step['input']['body'] = json.dumps(body)
        steps.append(step)
    workflow = {'id': 'execution-native', 'workflowId': WORKFLOW_ID, 'status': 'completed', 'triggeredBy': 'alert',
                'isTestRun': False, 'spaceId': 'default', 'startedAt': at(5), 'finishedAt': at(12),
                'context': {'event': {'rule': {'id': 'native-response-rule'}, 'alerts': [{'_id': alert['_id']}]}},
                'workflowDefinition': {'steps': definitions}, 'stepExecutions': steps}
    containment = {'workflow_execution': workflow, 'alert': alert, 'source_event': source, 'bucket': BUCKET,
                   'runtime': RUNTIME, 'credential_principal': RESPONSE_PRINCIPAL}
    receipt = {'response': run, 'containment': containment, 'baseline': {'response': baseline},
               'physical_output_absent': [{'tool_call_id': call['id'], 'uri': call['target']['uri'], 'http_status': 404, 'checked_at': at(23)}]}
    connector = {'id': CONNECTOR_ID, 'connector_type_id': '.http', 'config': {'url': IAM_URL}}
    content = {}
    for direction, value, suffix in (('input', call['input'], 'arguments'), ('output', call['result'], 'result')):
        content[direction] = {'text': json.dumps(value), 'source': 'google_adk.function_call.' + suffix,
                              'recordHash': call[('input' if direction == 'input' else 'result') + '_sha256'], 'redacted': False, 'truncated': False}
    hit = {'_index': NATIVE_INDEX, '_id': 'native-export', '_source': {
        'agent': {'id': AGENT_ID, 'type': 'google_adk'}, 'session': {'id': run['session_id']},
        'event': {'action': 'tool_call', 'outcome': 'failure'}, 'tool': {'name': 'export_case_summary', 'call': {'id': call['id']}},
        'source': {'kind': 'google_adk_cloud_run', 'observation_type': 'native_tool_completion', 'native_event_id': call['evidence_id'],
                   'input_sha256': call['input_sha256'], 'result_sha256': call['result_sha256'], 'record_hash': 'c' * 64},
        'google_adk': {'run_id': run['run_id'], 'trace_id': run['trace_id'], 'runtime': {'email': RUNTIME}, 'requester': run['requester']},
        'content': content}}
    return copy.deepcopy((run, receipt, hit, connector))


class NativePublisherTests(unittest.TestCase):
    def test_real_response_chain_yields_source_evidence_for_exact_failed_tool(self):
        run, receipt, hit, connector = fixture()
        event = make_event(run, run['calls'][0], receipt, hit, connector)
        self.assertEqual(event['event']['kind'], 'event')
        self.assertEqual(event['event']['action'], 'ai_tool_prevented')
        self.assertNotIn('kibana.alert.rule.uuid', event)
        control = event['entity_intelligence']['control']
        self.assertEqual((control['mode'], control['decision'], control['outcome']), ('enforce', 'deny', 'blocked'))
        self.assertEqual(control['engine'], 'elastic_workflows.google_storage_iam')
        self.assertIn('triggering lookup was not blocked', control['reason'])
        self.assertIn('independently joined Cloud Audit denial is not asserted', control['reason'])
        self.assertEqual(event['entity_intelligence']['invocation']['observation_id'], hit['_id'])
        self.assertEqual(event['entity_intelligence']['invocation']['correlation'], 'exact_native_observation')
        self.assertEqual(event, make_event(run, run['calls'][0], receipt, hit, connector))

    def test_gate_timeout_generic403_and_created_resources_cannot_be_native_denial(self):
        for changes in ({'resource_access': {}}, {'enforcement': {}}, {'resource': {}},
                        {'execution_status': 'prevented'}, {'resource_accessed': 'not_attempted'}, {'outcome': 'success'}):
            run, receipt, hit, connector = fixture()
            run['calls'][0].update(changes)
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                make_event(run, run['calls'][0], receipt, hit, connector)

    def test_wrong_status_target_hash_or_content_cannot_be_native_denial(self):
        for change in ('status', 'target', 'hash', 'input_content', 'output_content'):
            run, receipt, hit, connector = fixture()
            if change == 'status':
                run['calls'][0]['resource_access']['http_status'] = 500
            elif change == 'target':
                run['calls'][0]['target']['uri'] = 'gs://different/target'
            elif change == 'hash':
                run['calls'][0]['result_sha256'] = 'f' * 64
            else:
                hit['_source']['content']['input' if change == 'input_content' else 'output']['text'] = '{}'
            with self.subTest(change=change), self.assertRaises(ValueError):
                make_event(run, run['calls'][0], receipt, hit, connector)

    def test_manual_test_failed_or_unfinished_workflow_is_not_containment(self):
        for changes in ({'triggeredBy': 'manual'}, {'isTestRun': True}, {'status': 'running'}, {'status': 'failed'}, {'spaceId': 'other'}):
            run, receipt, hit, connector = fixture()
            receipt['containment']['workflow_execution'].update(changes)
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                validate_workflow(receipt['containment'], connector)

    def test_alert_must_bind_actual_saved_policy_source_and_workflow_trigger(self):
        for change in ('ancestor', 'trigger', 'policy', 'tool', 'runtime'):
            run, receipt, hit, connector = fixture()
            containment = receipt['containment']
            if change == 'ancestor':
                containment['alert']['_source']['kibana.alert.ancestors'][0]['id'] = 'other'
            elif change == 'trigger':
                containment['workflow_execution']['context']['event']['alerts'] = []
            elif change == 'policy':
                containment['source_event']['_source']['entity_intelligence']['control']['id'] = 'other'
            else:
                containment['source_event']['_source']['entity_intelligence']['invocation']['tool_name' if change == 'tool' else 'runtime_principal'] = 'other'
            with self.subTest(change=change), self.assertRaises(ValueError):
                validate_workflow(containment, connector)

    def test_connector_binding_and_google_http_receipts_are_required(self):
        for change in ('url', 'connector', 'method', 'status', 'owner', 'step_missing'):
            run, receipt, hit, connector = fixture()
            workflow = receipt['containment']['workflow_execution']
            if change == 'url':
                connector['config']['url'] = 'https://example.com/iam'
            elif change == 'connector':
                workflow['workflowDefinition']['steps'][1]['connector-id'] = 'other'
            elif change == 'method':
                workflow['stepExecutions'][1]['input']['method'] = 'POST'
            elif change == 'status':
                workflow['stepExecutions'][1]['output']['status'] = 403
            elif change == 'owner':
                workflow['stepExecutions'][1]['workflowRunId'] = 'other'
            else:
                workflow['stepExecutions'].pop()
            with self.subTest(change=change), self.assertRaises(ValueError):
                validate_workflow(receipt['containment'], connector)

    def test_role_must_exist_before_and_only_target_member_may_be_removed(self):
        for change in ('already_missing', 'still_present', 'other_member_removed', 'etag', 'body'):
            run, receipt, hit, connector = fixture()
            steps = receipt['containment']['workflow_execution']['stepExecutions']
            if change == 'already_missing':
                steps[0]['output']['data']['bindings'][0]['members'].remove(MEMBER)
            elif change == 'still_present':
                steps[2]['output']['data']['bindings'][0]['members'].append(MEMBER)
            elif change == 'other_member_removed':
                steps[2]['output']['data']['bindings'][0]['members'] = []
            else:
                body = json.loads(steps[1]['input']['body'])
                if change == 'etag':
                    body['etag'] = 'stale-etag'
                else:
                    body['bindings'] = []
                steps[1]['input']['body'] = json.dumps(body)
            with self.subTest(change=change), self.assertRaises(ValueError):
                validate_workflow(receipt['containment'], connector)

    def test_baseline_must_show_export_success_before_response_under_same_runtime(self):
        for change in ('runtime', 'time', 'resource', 'gate'):
            run, receipt, hit, connector = fixture()
            baseline = receipt['baseline']['response']
            if change == 'runtime':
                baseline['executing_principal']['email'] = 'someoneelse@example.com'
            elif change == 'time':
                baseline['completed_at'] = at(30)
            elif change == 'resource':
                baseline['calls'][0].pop('resource')
            else:
                baseline['calls'][0]['enforcement'] = {'status': 'workflow_allowed'}
            with self.subTest(change=change), self.assertRaises(ValueError):
                validate_baseline(receipt['baseline'], receipt['containment']['workflow_execution'])

    def test_denial_chronology_and_exact_target_absence_are_required(self):
        for change in ('early', 'not404', 'wrong_object', 'wrong_call', 'old_check'):
            run, receipt, hit, connector = fixture()
            absent = receipt['physical_output_absent'][0]
            if change == 'early':
                run['calls'][0]['started_at'] = at(7)
            elif change == 'not404':
                absent['http_status'] = 200
            elif change == 'wrong_object':
                absent['uri'] = 'gs://different/object'
            elif change == 'wrong_call':
                absent['tool_call_id'] = 'other'
            else:
                absent['checked_at'] = at(20)
            with self.subTest(change=change), self.assertRaises(ValueError):
                make_event(run, run['calls'][0], receipt, hit, connector)

    def test_triggering_lookup_is_not_misrepresented_as_blocked_export_session(self):
        run, receipt, hit, connector = fixture()
        for source in (receipt['containment']['source_event']['_source'], receipt['containment']['alert']['_source']):
            source['session']['id'] = run['session_id']
        with self.assertRaisesRegex(ValueError, 'triggering customer lookup must remain distinct'):
            make_event(run, run['calls'][0], receipt, hit, connector)


if __name__ == '__main__':
    unittest.main()
