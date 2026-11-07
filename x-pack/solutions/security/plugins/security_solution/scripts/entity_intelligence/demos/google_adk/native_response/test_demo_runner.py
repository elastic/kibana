"""Offline runner checks: proof ordering, reset safety, and read-only cloud verification."""
import io
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import Mock, patch

import demo
from test_publish_native_block import fixture as native_evidence_fixture


def denied_call():
    target = {'bucket': demo.BUCKET, 'object': 'exports/run/tool.json',
              'uri': 'gs://' + demo.BUCKET + '/exports/run/tool.json'}
    return {'id': 'call-1', 'name': 'export_case_summary', 'outcome': 'failure',
            'execution_status': 'denied_by_provider', 'resource_accessed': 'denied', 'target': target,
            'result': {'error': 'storage_write_http_403'},
            'resource_access': {'status': 'denied', 'provider': 'google_cloud_storage',
                'operation': 'storage.objects.create', 'http_status': 403, 'target': target}}


class DemoProofTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.config = {'workflow_url': 'http://127.0.0.1:5601/app/workflows/containment',
            'restore_workflow_url': 'http://127.0.0.1:5601/app/workflows/restore',
            'rule_url': 'http://127.0.0.1:5601/app/security/rules/id', 'restore_workflow_id': 'restore-id'}
        for item in [patch.object(demo, 'ROOT', self.root), patch.object(demo, 'read_state', return_value=self.config),
                     patch.object(demo, 'Client')]:
            item.start()
            self.addCleanup(item.stop)
        self.run = demo.DemoRun('verify')
        self.response = {'run_id': 'native-run', 'session_id': 'native-session', 'calls': [denied_call()]}
        baseline = self.root / 'baseline.json'
        containment = self.root / 'containment.json'
        baseline.write_text('{}')
        containment.write_text(json.dumps({'workflow_execution': {'id': 'native-workflow-execution'}}))
        demo.save(self.root / 'demo_state.json', {'baseline': {'path': str(baseline)},
                                                'containment': {'path': str(containment)}})
        (self.root / 'publish_native_block.py').write_text('# Offline publisher placeholder; never executed.\n')

    def publisher(self, alerts=None, code=0, report_changes=None):
        def execute(command, **kwargs):
            self.assertEqual(command[-2:], ['--wait-seconds', '60'])
            if not code:
                report = {'run_id': self.response['run_id'], 'session_id': self.response['session_id'],
                    'workflow_execution_id': 'native-workflow-execution', 'dry_run': False,
                    'source_event_ids': ['verified-source-event'], 'alerts': alerts or []}
                report.update(report_changes or {})
                (self.run.directory / 'block-evidence.json').write_text(json.dumps(report))
            return subprocess.CompletedProcess(command, code)
        return execute

    def baseline_response(self):
        # Shape observed in the real 94e3398a baseline: upload receipt has no
        # bucket/object fields; the separately recorded target identifies them.
        target = {"bucket": demo.BUCKET, "object": "exports/run/tool.json",
                  "uri": "gs://" + demo.BUCKET + "/exports/run/tool.json"}
        return {"run_id": "baseline-run", "session_id": "baseline-session", "calls": [{
            "id": "call-baseline", "name": "export_case_summary", "outcome": "success", "target": target,
            "resource": {"uri": target["uri"], "generation": "1792017029223345",
                         "sha256": "e7ff0bbe7e135c2758026e43ff2173d22c4f4a65023275b601772785c7dbbb3a",
                         "bytes": 265, "operation": "created"}}]}

    def test_real_baseline_upload_shape_uses_target_and_verifies_receipt_generation(self):
        response = self.baseline_response()
        self.run.stage = 'baseline'
        self.run.state['stage'] = 'baseline'
        self.run.state['result']['iam_policy_change_verified'] = True  # Confirmed restore.
        call = response['calls'][0]
        self.assertNotIn('bucket', call['resource'])
        with patch.object(demo, 'CloudEvidence') as cloud:
            cloud.return_value.metadata.return_value = {'generation': call['resource']['generation']}
            self.run.baseline(response)
        cloud.return_value.metadata.assert_called_once_with(call['target'])
        self.assertEqual(self.run.state['result']['outcome'], 'export_allowed')
        self.assertTrue(self.run.state['result']['iam_policy_change_verified'])
        self.assertFalse(self.run.state['result']['data_plane_block_verified'])
        stored = json.loads((self.run.directory / 'baseline.json').read_text())
        self.assertEqual(stored['response'], response)
        self.assertEqual(demo.demo_state()['baseline']['job_id'], self.run.id)

    def test_baseline_generation_mismatch_does_not_claim_success(self):
        response = self.baseline_response()
        with patch.object(demo, 'CloudEvidence') as cloud:
            cloud.return_value.metadata.return_value = {'generation': 'different-generation'}
            with self.assertRaisesRegex(ValueError, 'generation could not be independently verified'):
                self.run.baseline(response)
        self.assertNotIn('outcome', self.run.state['result'])
        self.assertFalse((self.run.directory / 'baseline.json').exists())

    def containment_fixture(self):
        self.run.config.update(event_index='logs-entity_intelligence.security-default',
            policy_id='protected-reference-policy', rule_id='native-rule-id', workflow_id='native-workflow-id')
        self.response['started_at'] = '2026-10-14T22:00:00Z'
        source = {'_id': 'exact-policy-event', '_index': self.run.config['event_index'], '_source': {}}
        alert = {'_id': 'actual-native-alert', '_index': '.internal.alerts-security.alerts-default-000001',
                 '_source': {'kibana.alert.ancestors': [{'id': source['_id'], 'index': source['_index'], 'type': 'event'}],
                             # This retained source field is intentionally not indexed in the alert.
                             'entity_intelligence.invocation.request_id': self.response['run_id']}}
        workflow = native_evidence_fixture()[1]['containment']['workflow_execution']
        workflow.update(id='actual-alert-workflow-run', workflowId='native-workflow-id',
                        context={'event': {'alerts': [{'_id': alert['_id']}]}})
        for step in workflow['stepExecutions']:
            step.update(workflowRunId=workflow['id'], workflowId=workflow['workflowId'])
        self.run.es = Mock()
        self.run.kibana = Mock()
        return source, alert, workflow

    def test_containment_alert_query_uses_indexed_native_ancestry_not_custom_request_id(self):
        source, alert, workflow = self.containment_fixture()
        wrong_index = {'_id': 'same-id-wrong-index', '_source': {'kibana.alert.ancestors': [
            {'id': source['_id'], 'index': 'other-source-index'}]}}
        self.run.es.request.side_effect = [{'hits': {'hits': [source]}}, {'hits': {'hits': [wrong_index, alert]}}]
        self.run.kibana.request.side_effect = [{}, {'results': [{'id': workflow['id'], 'status': 'completed',
            'workflowId': workflow['workflowId'], 'triggeredBy': 'alert', 'isTestRun': False,
            'startedAt': self.response['started_at']}], 'size': 30, 'page': 1, 'total': 1}]
        with patch.object(self.run, 'execution', return_value=workflow), \
                patch.object(self.run, 'wait_execution', return_value=workflow) as wait, \
                patch.object(demo, 'CloudEvidence') as cloud:
            cloud.return_value.get.return_value = {'bindings': []}
            self.run.await_containment(self.response)
        source_query, alert_query = [call.args[2] for call in self.run.es.request.call_args_list]
        self.assertIn({'term': {'entity_intelligence.invocation.request_id': self.response['run_id']}},
                      source_query['query']['bool']['filter'])
        alert_terms = alert_query['query']['bool']['filter']
        self.assertIn({'term': {'kibana.alert.ancestors.id': source['_id']}}, alert_terms)
        self.assertIn({'term': {'kibana.alert.rule.uuid': 'native-rule-id'}}, alert_terms)
        self.assertNotIn('entity_intelligence.invocation.request_id', json.dumps(alert_query))
        wait.assert_called_once_with(workflow['id'])
        listing_call = self.run.kibana.request.call_args_list[1]
        self.assertEqual(listing_call.args[0], 'GET')
        listing_url = demo.urllib.parse.urlsplit(listing_call.args[1])
        self.assertEqual(listing_url.path, '/api/workflows/workflow/native-workflow-id/executions')
        self.assertEqual(demo.urllib.parse.parse_qs(listing_url.query), {
            'startedAfter': [self.response['started_at']], 'size': ['30'],
            'sortField': ['createdAt'], 'sortOrder': ['desc']})
        evidence = json.loads((self.run.directory / 'containment.json').read_text())
        self.assertEqual(evidence['alert']['_id'], alert['_id'])
        self.assertTrue(self.run.state['result']['iam_policy_change_verified'])
        self.assertFalse(self.run.state['result']['data_plane_block_verified'])

    def test_already_absent_permission_is_confirmed_without_claiming_a_new_removal(self):
        source, alert, workflow = self.containment_fixture()
        read, change, readback = workflow['stepExecutions']
        read['output']['data']['bindings'] = change['output']['data']['bindings']
        self.run.es.request.side_effect = [{'hits': {'hits': [source]}}, {'hits': {'hits': [alert]}}]
        self.run.kibana.request.side_effect = [{}, {'results': [{'id': workflow['id']}]}]
        with patch.object(self.run, 'execution', return_value=workflow), \
                patch.object(self.run, 'wait_execution', return_value=workflow), \
                patch.object(demo, 'CloudEvidence') as cloud:
            cloud.return_value.get.return_value = {'bindings': []}
            self.run.await_containment(self.response)
        result = self.run.state['result']
        self.assertEqual(result['outcome'], 'access_already_contained')
        self.assertFalse(result['iam_policy_change_verified'])
        self.assertTrue(result['permission_absence_verified'])
        self.assertFalse(result['data_plane_block_verified'])
        self.assertIn('already absent', result['message'])
        self.assertNotIn('containment', demo.demo_state())
        self.assertEqual(demo.demo_state()['last_containment_confirmation']['job_id'], self.run.id)
        proof = json.loads((self.run.directory / 'containment.json').read_text())
        self.assertFalse(proof['permission_evidence']['grant_present_before'])

    def test_matching_ancestor_id_from_wrong_source_index_is_rejected(self):
        source, alert, _ = self.containment_fixture()
        alert['_source']['kibana.alert.ancestors'][0]['index'] = 'unrelated-index'
        self.run.es.request.side_effect = [{'hits': {'hits': [source]}}, {'hits': {'hits': [alert]}}]
        self.run.kibana.request.return_value = {}
        with patch.object(demo.time, 'monotonic', side_effect=[0, 1, 2, 3, 200]), \
                patch.object(demo.time, 'sleep'), patch.object(demo, 'CloudEvidence') as cloud:
            with self.assertRaisesRegex(RuntimeError, 'has not produced its alert yet'):
                self.run.await_containment(self.response)
        cloud.assert_not_called()
        self.assertFalse((self.run.directory / 'containment.json').exists())
        self.assertFalse(self.run.state['result']['iam_policy_change_verified'])

    def test_error_string_without_provider_evidence_cannot_claim_containment(self):
        self.response['calls'] = [{'name': 'export_case_summary', 'outcome': 'failure',
                                  'result': {'error': 'storage_write_http_403'}}]
        with patch.object(demo, 'CloudEvidence') as cloud, patch.object(demo.subprocess, 'run') as execute:
            with self.assertRaisesRegex(ValueError, 'other than a proven'):
                self.run.verify(self.response)
        cloud.assert_not_called()
        execute.assert_not_called()
        self.assertFalse(self.run.state['result']['data_plane_block_verified'])

    def test_old_application_gate_does_not_count_as_google_denial(self):
        call = denied_call()
        call['enforcement'] = {'status': 'workflow_blocked'}
        self.assertFalse(demo.native_denial(call))
        call = denied_call()
        call['resource'] = {'uri': call['target']['uri'], 'generation': '123'}
        self.assertFalse(demo.native_denial(call))
        call = denied_call()
        call['resource_access']['http_status'] = 503
        self.assertFalse(demo.native_denial(call))

    def test_successful_export_stays_propagation_pending(self):
        self.response['calls'] = [{'name': 'export_case_summary', 'outcome': 'success'}]
        with patch.object(demo, 'CloudEvidence') as cloud:
            self.run.verify(self.response)
        cloud.assert_not_called()
        self.assertEqual(self.run.state['result']['outcome'], 'propagation_pending')
        self.assertFalse(self.run.state['result']['data_plane_block_verified'])

    def test_existing_target_prevents_block_claim_and_publication(self):
        with patch.object(demo, 'CloudEvidence') as cloud, patch.object(demo.subprocess, 'run') as execute:
            cloud.return_value.metadata.return_value = {'generation': '123'}
            with self.assertRaisesRegex(ValueError, 'target object exists'):
                self.run.verify(self.response)
        execute.assert_not_called()
        self.assertFalse(self.run.state['result']['data_plane_block_verified'])

    def test_publisher_failure_cannot_leave_verified_workflow_attribution(self):
        with patch.object(demo, 'CloudEvidence') as cloud, \
                patch.object(demo.subprocess, 'run', side_effect=self.publisher(code=1)):
            cloud.return_value.metadata.return_value = None
            with self.assertRaisesRegex(RuntimeError, 'publishing its correlated finding'):
                self.run.verify(self.response)
        self.assertFalse(self.run.state['result']['data_plane_block_verified'])
        self.assertFalse(self.run.state['result']['iam_policy_change_verified'])
        self.assertNotIn('google_denied', [event['type'] for event in self.run.state['events']])
        self.assertIn('provider_denied', [event['type'] for event in self.run.state['events']])

    def test_wrong_report_identity_cannot_claim_linked_containment(self):
        with patch.object(demo, 'CloudEvidence') as cloud, \
                patch.object(demo.subprocess, 'run', side_effect=self.publisher(report_changes={'run_id': 'other-run'})):
            cloud.return_value.metadata.return_value = None
            with self.assertRaisesRegex(ValueError, 'does not match this run'):
                self.run.verify(self.response)
        self.assertFalse(self.run.state['result']['data_plane_block_verified'])

    def test_validated_denial_without_alert_is_not_finding_ready(self):
        with patch.object(demo, 'CloudEvidence') as cloud, \
                patch.object(demo.subprocess, 'run', side_effect=self.publisher()):
            cloud.return_value.metadata.return_value = None
            with self.assertRaisesRegex(RuntimeError, 'blocked finding is not visible yet'):
                self.run.verify(self.response)
        self.assertTrue(self.run.state['result']['data_plane_block_verified'])
        self.assertEqual(self.run.state['result']['outcome'], 'google_denied')
        self.assertNotIn('finding_ready', [event['type'] for event in self.run.state['events']])

    def test_validated_denial_with_alert_publishes_complete_result(self):
        with patch.object(demo, 'CloudEvidence') as cloud, \
                patch.object(demo.subprocess, 'run', side_effect=self.publisher(alerts=[{'id': 'real-alert'}])):
            cloud.return_value.metadata.return_value = None
            self.run.verify(self.response)
        self.assertTrue(self.run.state['result']['data_plane_block_verified'])
        self.assertEqual(self.run.state['result']['workflow_execution_id'], 'native-workflow-execution')
        self.assertEqual(self.run.state['events'][-1]['type'], 'finding_ready')
        self.assertNotIn('finding_url', self.run.state['result'])

    def test_restore_calls_native_workflow_and_clears_prior_proof(self):
        self.run.kibana.request.return_value = {'executionId': 'restore-execution'}
        with patch.object(self.run, 'wait_execution', return_value={'status': 'completed'}), \
                patch.object(demo, 'CloudEvidence') as cloud:
            cloud.return_value.get.return_value = {'bindings': [{'role': demo.ROLE, 'members': [demo.MEMBER]}]}
            self.run.restore()
        self.run.kibana.request.assert_called_once_with('POST', '/api/workflows/workflow/restore-id/run', {'inputs': {}})
        cloud.return_value.get.assert_called_once_with('/storage/v1/b/' + demo.BUCKET + '/iam?optionsRequestedPolicyVersion=3')
        saved = demo.demo_state()
        self.assertNotIn('containment', saved)
        self.assertNotIn('baseline', saved)
        self.assertEqual(saved['restore']['workflow_execution_id'], 'restore-execution')
        self.assertTrue(self.run.state['result']['iam_policy_change_verified'])
        self.assertFalse(self.run.state['result']['data_plane_block_verified'])

    def test_unconfirmed_restore_does_not_invent_restored_access(self):
        self.run.kibana.request.return_value = {'executionId': 'restore-execution'}
        with patch.object(self.run, 'wait_execution', return_value={'status': 'completed'}), \
                patch.object(demo, 'CloudEvidence') as cloud:
            cloud.return_value.get.return_value = {'bindings': []}
            with self.assertRaisesRegex(ValueError, 'did not confirm restored'):
                self.run.restore()
        self.assertIn('containment', demo.demo_state())
        self.assertFalse(self.run.state['result']['iam_policy_change_verified'])

    def test_verify_preconditions_prevent_agent_run(self):
        demo.save(self.root / 'demo_state.json', {})
        with patch.object(self.run, 'refresh_credentials'), patch.object(self.run, 'invoke') as invoke:
            result = self.run.run()
        invoke.assert_not_called()
        self.assertEqual(result['status'], 'error')
        self.assertFalse(result['result']['data_plane_block_verified'])

    def test_free_prompt_runs_and_imports_without_restore_or_expected_tool(self):
        demo.save(self.root / 'demo_state.json', {})
        run = demo.DemoRun('ask', 'What support tools can you use?')
        response = {'run_id': 'free-run', 'session_id': 'free-session', 'calls': [], 'answer': 'Available tools.'}
        with patch.object(run, 'refresh_credentials'), patch.object(run, 'invoke', return_value=response) as invoke, \
                patch.object(run, 'sync') as sync, patch.object(run, 'restore') as restore, \
                patch.object(run, 'await_containment') as contain, patch.object(run, 'verify') as verify:
            result = run.run()
        invoke.assert_called_once()
        sync.assert_called_once_with(response)
        restore.assert_not_called()
        contain.assert_not_called()
        verify.assert_not_called()
        self.assertEqual(result['status'], 'completed')
        self.assertEqual(result['result']['outcome'], 'agent_completed')
        self.assertFalse(result['result']['iam_policy_change_verified'])
        self.assertFalse(result['result']['data_plane_block_verified'])
        self.assertEqual(demo.demo_state()['last_runs']['ask'], run.id)

    def test_free_prompt_denial_does_not_invent_workflow_attribution(self):
        run = demo.DemoRun('ask', 'Export the support summary.')
        run.record_reply(self.response)
        self.assertEqual(run.state['result']['provider_denials_observed'], 1)
        self.assertFalse(run.state['result']['data_plane_block_verified'])
        self.assertFalse(run.state['result']['iam_policy_change_verified'])
        self.assertNotIn('workflow_execution_id', run.state['result'])

    def test_empty_free_prompt_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'Prompt must be'):
            demo.DemoRun('ask', '   ')


class ReadOnlyCloudEvidenceTests(unittest.TestCase):
    def test_cloud_verification_performs_get_without_data_and_does_not_return_token(self):
        client = demo.CloudEvidence.__new__(demo.CloudEvidence)
        client.token = 'SECRET_TOKEN'
        client.opener = Mock()
        client.opener.open.return_value.__enter__ = Mock(return_value=io.BytesIO(b'{"bindings":[]}'))
        client.opener.open.return_value.__exit__ = Mock(return_value=False)
        result = client.get('/storage/v1/b/' + demo.BUCKET + '/iam')
        request = client.opener.open.call_args.args[0]
        self.assertEqual(request.get_method(), 'GET')
        self.assertIsNone(request.data)
        self.assertEqual(request.full_url, 'https://storage.googleapis.com/storage/v1/b/' + demo.BUCKET + '/iam')
        self.assertNotIn('SECRET_TOKEN', json.dumps(result))


class NativePermissionEvidenceTests(unittest.TestCase):
    def workflow(self):
        return native_evidence_fixture()[1]['containment']['workflow_execution']

    def test_actual_removal_requires_recorded_permission_before_and_absence_after(self):
        workflow = self.workflow()
        result = demo.workflow_permission_evidence(workflow, workflow['workflowId'])
        self.assertTrue(result['iam_policy_change_verified'])
        self.assertTrue(result['permission_absence_verified'])

    def test_changed_etag_alone_does_not_prove_a_permission_was_removed(self):
        workflow = self.workflow()
        read, change, readback = workflow['stepExecutions']
        read['output']['data']['bindings'] = change['output']['data']['bindings']
        result = demo.workflow_permission_evidence(workflow, workflow['workflowId'])
        self.assertNotEqual(result['etag_before'], result['etag_after'])
        self.assertFalse(result['iam_policy_change_verified'])
        self.assertTrue(result['permission_absence_verified'])

    def test_same_etag_cannot_support_fresh_removal_claim(self):
        workflow = self.workflow()
        for step in workflow['stepExecutions']:
            step['output']['data']['etag'] = 'before-etag'
        with self.assertRaisesRegex(ValueError, 'new Google policy etag'):
            demo.workflow_permission_evidence(workflow, workflow['workflowId'])

    def test_unrelated_permission_change_is_rejected(self):
        workflow = self.workflow()
        workflow['stepExecutions'][-1]['output']['data']['bindings'] = []
        with self.assertRaisesRegex(ValueError, 'preserve the other permissions'):
            demo.workflow_permission_evidence(workflow, workflow['workflowId'])

    def test_other_execution_or_missing_steps_cannot_prove_removal(self):
        for missing in (True, False):
            workflow = self.workflow()
            if missing:
                workflow['stepExecutions'].pop()
            else:
                workflow['stepExecutions'][0]['workflowRunId'] = 'other-execution'
            with self.subTest(missing=missing), self.assertRaises(ValueError):
                demo.workflow_permission_evidence(workflow, workflow['workflowId'])


if __name__ == '__main__':
    unittest.main()
