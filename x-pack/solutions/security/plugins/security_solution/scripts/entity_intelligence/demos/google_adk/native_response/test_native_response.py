import copy
import datetime as dt
import json
from pathlib import Path
import subprocess
import unittest

import setup_native_response as setup

from demo_config import NODE, REPO
RENDER = r'''
const fs = require('node:fs');
const {Liquid} = require('liquidjs');
const YAML = require('yaml');
const data = JSON.parse(fs.readFileSync(0, 'utf8'));
const workflow = YAML.parse(fs.readFileSync(data.path, 'utf8'));
const step = workflow.steps.find(s => s.type === 'http' && s.with.method === 'PUT');
const engine = new Liquid({ownPropertyOnly:true, strictFilters:true});
const rendered = engine.parseAndRenderSync(step.with.body, {
  consts: workflow.consts,
  steps:{read_current_export_bucket_iam:{output:{data:data.policy}}}
});
process.stdout.write(JSON.stringify(JSON.parse(rendered)));
'''


def render(name, policy):
    result = subprocess.run([NODE, '-e', RENDER], cwd=REPO, text=True,
                            input=json.dumps({'path': str(setup.ROOT / (name + '.yaml')), 'policy': policy}),
                            capture_output=True, check=True)
    return json.loads(result.stdout)


def sample():
    return {'version': 3, 'etag': 'BwSafeEtag', 'kind': 'storage#policy',
            'resourceId': 'projects/_/buckets/' + setup.BUCKET,
            'bindings': [
                {'role': 'roles/storage.legacyBucketOwner', 'members': ['projectOwner:example-ei-project']},
                {'role': setup.ROLE, 'members': [setup.MEMBER, 'serviceAccount:other@example.test']},
                {'role': setup.ROLE, 'members': [setup.MEMBER], 'condition': {'title': 'temporary', 'expression': "request.time < timestamp('2030-01-01T00:00:00Z')", 'description': 'Preserve if any member remains'}},
                {'role': 'roles/storage.objectViewer', 'members': [setup.MEMBER]},
                {'role': 'projects/example-ei-project/roles/eiAgentDemoBucketResponse', 'members': ['serviceAccount:' + setup.RESPONSE_PRINCIPAL]},
            ]}


class IamTransformTests(unittest.TestCase):
    def test_revoke_preserves_other_members_roles_and_concurrency_etag(self):
        original = sample()
        result = render('containment', original)
        self.assertEqual(result['etag'], original['etag'])
        self.assertEqual(result['version'], 3)
        self.assertEqual(result['bindings'], [original['bindings'][0],
                         {'role': setup.ROLE, 'members': ['serviceAccount:other@example.test']},
                         original['bindings'][3], original['bindings'][4]])

    def test_revoke_preserves_conditional_binding_for_other_member(self):
        policy = sample()
        policy['bindings'][2]['members'].append('user:unrelated@example.test')
        result = render('containment', policy)
        conditional = next(item for item in result['bindings'] if item.get('condition'))
        self.assertEqual(conditional['condition'], policy['bindings'][2]['condition'])
        self.assertEqual(conditional['members'], ['user:unrelated@example.test'])

    def test_revoke_is_idempotent(self):
        once = render('containment', sample())
        self.assertEqual(render('containment', once), once)

    def test_restore_adds_only_runtime_and_is_idempotent(self):
        revoked = render('containment', sample())
        restored = render('restore', revoked)
        self.assertEqual(restored['etag'], revoked['etag'])
        self.assertEqual(restored['bindings'][1]['members'], ['serviceAccount:other@example.test', setup.MEMBER])
        self.assertEqual(restored['bindings'][2:], revoked['bindings'][2:])
        self.assertEqual(render('restore', restored), restored)

    def test_restore_adds_binding_when_role_absent(self):
        policy = {'version': 1, 'etag': 'same', 'bindings': []}
        self.assertEqual(render('restore', policy), {'version': 1, 'etag': 'same', 'bindings': [{'role': setup.ROLE, 'members': [setup.MEMBER]}]})

    def test_restore_does_not_broaden_existing_condition(self):
        policy = sample()
        policy['bindings'] = [policy['bindings'][2], policy['bindings'][4]]
        restored = render('restore', policy)
        self.assertEqual(restored['bindings'][:2], policy['bindings'])
        self.assertEqual(restored['bindings'][2], {'role': setup.ROLE, 'members': [setup.MEMBER]})


class AuthAndRuleTests(unittest.TestCase):
    def setUp(self):
        self.expiry = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(minutes=20)).isoformat()

    def test_connector_secret_not_in_config_and_endpoint_fixed(self):
        connector = setup.connector_definition('testtoken' * 8, setup.RESPONSE_PRINCIPAL, self.expiry)
        self.assertNotIn('testtoken', json.dumps(connector['config']))
        self.assertEqual(connector['secrets']['secretHeaders']['Authorization'], 'Bearer ' + 'testtoken' * 8)
        self.assertEqual(connector['config']['url'], setup.IAM_URL)
        self.assertFalse(connector['config']['hasAuth'])
        self.assertIsNone(connector['config']['authType'])

    def test_rejects_broad_user_credential_identity_and_expired_token(self):
        with self.assertRaises(ValueError):
            setup.token_secret('testtoken' * 8, 'operator@example.com', self.expiry)
        with self.assertRaises(ValueError):
            setup.token_secret('testtoken' * 8, setup.RESPONSE_PRINCIPAL, '2000-01-01T00:00:00Z')

    def test_rejects_header_injection(self):
        with self.assertRaises(ValueError):
            setup.token_secret('testtoken' * 8 + '\nInjected: header', setup.RESPONSE_PRINCIPAL, self.expiry)

    def test_rule_narrow_scope_and_historical_cutoff(self):
        activation = '2026-10-14T22:00:00Z'
        rule = setup.rule_definition(activation)
        for expected in (setup.RUNTIME, setup.AGENT_ID, setup.POLICY_ID, activation, 'read_customer_reference'):
            self.assertIn(expected, rule['query'])
        self.assertEqual(rule['index'], [setup.EVENT_INDEX])
        self.assertEqual(rule['actions'][0]['params']['subActionParams']['workflowId'], setup.WORKFLOW_ID)


if __name__ == '__main__':
    unittest.main()
