"""Offline checks for optional native risk context around a real guided trigger."""
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import demo
import requester_risk


class RequesterRiskConsoleTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        config = {'workflow_url': 'http://localhost:5601/app/workflows/containment',
                  'restore_workflow_url': 'http://localhost:5601/app/workflows/restore',
                  'rule_url': 'http://localhost:5601/app/security/rules/id'}
        for item in (patch.object(demo, 'ROOT', self.root),
                     patch.object(demo, 'read_state', return_value=config),
                     patch.object(demo, 'Client')):
            item.start()
            self.addCleanup(item.stop)
        self.identity = {'id': 'user:100000000000000000001@unknown',
                         'subject': '100000000000000000001', 'name': 'requester@example.com'}
        self.response = {'requester': {
            'subject': self.identity['subject'], 'email': self.identity['name'],
            'authenticated': True, 'principal_type': 'google_account',
            'provenance': requester_risk.PROVENANCE, 'human_identity': 'account_level_only'},
            'executing_principal': {'email': demo.RUNTIME}, 'run_id': 'actual-run',
            'session_id': 'actual-session'}
        self.run = demo.DemoRun('trigger')

    @staticmethod
    def snapshot(score, count):
        return {'latest_native_risk': {'calculated_score_norm': score,
                    'calculated_level': 'Moderate', 'category_1_count': count,
                    'inputs': [{'id': 'real-input'}]},
                'resolved_contributor_alerts': [{'private': 'full source retained on disk'}],
                'limitations': ['Native scoring counts alerts, not distinct actions.']}

    def execute(self, snapshots, baseline_error=None, outcome='iam_changed'):
        order = []

        def snapshot(*_args):
            order.append('risk')
            value = next(snapshots)
            if isinstance(value, Exception):
                raise value
            return value

        def invoke():
            order.append('invoke')
            return self.response

        def containment(_response):
            order.append('containment')
            self.run.state['result'].update(outcome=outcome, iam_policy_change_verified=outcome == 'iam_changed')

        with patch.object(requester_risk, 'current_requester', return_value=self.identity,
                          side_effect=baseline_error), \
                patch.object(requester_risk, 'ensure_entity'), \
                patch.object(requester_risk, 'risk_snapshot', side_effect=snapshot), \
                patch.object(self.run, 'refresh_credentials'), \
                patch.object(self.run, 'invoke', side_effect=invoke), \
                patch.object(self.run, 'sync'), \
                patch.object(self.run, 'await_containment', side_effect=containment):
            result = self.run.run()
        return result, order

    def test_guided_trigger_captures_before_then_live_run_then_containment_then_after(self):
        result, order = self.execute(iter([self.snapshot(56.95, 11), self.snapshot(58.12, 13)]))
        self.assertEqual(order, ['risk', 'invoke', 'containment', 'risk'])
        self.assertEqual(result['status'], 'completed')
        risk = result['result']['entity_risk']
        self.assertEqual(risk['status'], 'verified')
        self.assertEqual(risk['before']['scored_alerts'], 11)
        self.assertEqual(risk['after']['scored_alerts'], 13)
        self.assertAlmostEqual(risk['score_delta'], 1.17)
        self.assertIn('entityId=user%3A100000000000000000001%40unknown', result['result']['entity_url'])
        self.assertNotIn('resolved_contributor_alerts', json.dumps(result))
        for name in ('before', 'after'):
            path = self.run.directory / ('requester-risk-' + name + '.json')
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)
            self.assertIn('resolved_contributor_alerts', json.loads(path.read_text())['snapshot'])

    def test_changed_requester_cannot_receive_the_prior_identity_score_or_link(self):
        self.response['requester']['subject'] = 'different-subject'
        result, order = self.execute(iter([self.snapshot(56.95, 11)]))
        self.assertEqual(order, ['risk', 'invoke', 'containment'])
        self.assertEqual(result['status'], 'completed')
        self.assertTrue(result['result']['iam_policy_change_verified'])
        self.assertEqual(result['result']['entity_risk']['status'], 'unavailable')
        self.assertNotIn('entity_url', result['result'])

    def test_optional_baseline_failure_does_not_prevent_real_containment(self):
        result, order = self.execute(iter([]), baseline_error=RuntimeError('private diagnostics'))
        self.assertEqual(order, ['invoke', 'containment'])
        self.assertEqual(result['status'], 'completed')
        self.assertEqual(result['result']['outcome'], 'iam_changed')
        self.assertEqual(result['result']['entity_risk']['status'], 'unavailable')
        self.assertNotIn('private diagnostics', json.dumps(result))

    def test_optional_after_failure_does_not_overwrite_verified_iam_result(self):
        result, _ = self.execute(iter([self.snapshot(56.95, 11), RuntimeError('Risk API failed')]))
        self.assertEqual(result['status'], 'completed')
        self.assertTrue(result['result']['iam_policy_change_verified'])
        self.assertEqual(result['result']['entity_risk']['status'], 'unavailable')
        self.assertNotIn('entity_url', result['result'])

    def test_unchanged_native_score_is_preserved(self):
        result, _ = self.execute(iter([self.snapshot(56.95, 11), self.snapshot(56.95, 11)]))
        self.assertEqual(result['result']['entity_risk']['score_delta'], 0)

    def test_already_contained_access_still_receives_actual_native_risk_comparison(self):
        result, order = self.execute(iter([self.snapshot(56.95, 11), self.snapshot(58.12, 13)]),
                                     outcome='access_already_contained')
        self.assertEqual(order, ['risk', 'invoke', 'containment', 'risk'])
        self.assertEqual(result['result']['outcome'], 'access_already_contained')
        self.assertFalse(result['result']['iam_policy_change_verified'])
        self.assertEqual(result['result']['entity_risk']['status'], 'verified')

    def test_free_prompt_does_not_trigger_risk_enrollment_or_calculation(self):
        self.run.stage = 'ask'
        self.run.state['stage'] = 'ask'
        with patch.object(self.run, 'refresh_credentials'), \
                patch.object(self.run, 'invoke', return_value=self.response), \
                patch.object(self.run, 'sync'), \
                patch.object(self.run, 'capture_requester_baseline') as baseline:
            result = self.run.run()
        baseline.assert_not_called()
        self.assertNotIn('entity_risk', result['result'])
        self.assertEqual(result['status'], 'completed')


if __name__ == '__main__':
    unittest.main()
