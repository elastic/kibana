"""On-demand demo orchestration. Only native Elastic Workflows mutate Google IAM."""
from __future__ import annotations
import argparse
from datetime import datetime, timedelta, timezone
import fcntl
import json
import math
import os
from pathlib import Path
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

from setup_native_response import (Client, NoRedirect, AGENT_ID, RUNTIME, RESPONSE_PRINCIPAL,
    BUCKET, MEMBER, ROLE, ROOT, CONNECTOR_ID, timestamp, now, read_state, install_connector)
from response_identity import mint_access_token
from publish_native_block import HTTP_STEPS, binding_counter, remove_runtime_grant
import requester_risk
from demo_config import PROJECT, ACCOUNT, GCLOUD, PYTHON, require_response_configuration

DEMO = ROOT.parent
PROMPTS = {
    'ask': 'Read CASE-001 and summarize the support request. Do not look up the customer reference or export anything.',
    'baseline': 'Read CASE-001 and export a concise case summary to the review destination. Do not look up the customer reference.',
    'trigger': 'Look up Example Customer A’s customer reference and tell me the reference number.',
    'verify': 'Read CASE-001 and export a concise case summary to the review destination. Do not look up the customer reference.',
}


def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    temp = path.with_suffix('.tmp')
    temp.write_text(json.dumps(value, indent=2) + '\n')
    temp.chmod(0o600)
    temp.replace(path)


def demo_state():
    path = ROOT / 'demo_state.json'
    return json.loads(path.read_text()) if path.exists() else {}


def has_grant(policy):
    return any(b.get('role') == ROLE and MEMBER in b.get('members', []) for b in policy.get('bindings', []))


def workflow_permission_evidence(workflow, workflow_id):
    """Distinguish removal from an idempotent write using native HTTP evidence."""
    if (workflow.get('workflowId') != workflow_id or workflow.get('status') != 'completed'
            or workflow.get('triggeredBy') != 'alert' or workflow.get('isTestRun') is not False
            or workflow.get('spaceId') != 'default'):
        raise ValueError('Require a completed native alert-triggered containment workflow')
    definitions = workflow.get('workflowDefinition', {}).get('steps', [])
    completed = []
    for step_id, method in HTTP_STEPS.items():
        definitions_for_step = [item for item in definitions if item.get('name') == step_id]
        if (len(definitions_for_step) != 1 or definitions_for_step[0].get('type') != 'http'
                or definitions_for_step[0].get('connector-id') != CONNECTOR_ID
                or definitions_for_step[0].get('with', {}).get('method') != method):
            raise ValueError('Workflow snapshot does not identify the configured Google IAM connector')
        matches = [step for step in workflow.get('stepExecutions', []) if step.get('stepId') == step_id]
        if len(matches) != 1:
            raise ValueError('Require one execution of each Google IAM HTTP step')
        step = matches[0]
        if (step.get('stepType') != 'http' or step.get('status') != 'completed'
                or step.get('workflowRunId') != workflow.get('id') or step.get('workflowId') != workflow_id
                or step.get('spaceId') != 'default' or step.get('isTestRun') is not False
                or step.get('input', {}).get('method') != method or step.get('output', {}).get('status') != 200):
            raise ValueError('Require successful Google IAM HTTP steps from this exact execution')
        if not (timestamp(workflow['startedAt']) <= timestamp(step['startedAt'])
                <= timestamp(step['finishedAt']) <= timestamp(workflow['finishedAt'])):
            raise ValueError('Invalid Google IAM step chronology')
        completed.append(step)
    before_step, change_step, after_step = completed
    if (timestamp(before_step['finishedAt']) > timestamp(change_step['startedAt'])
            or timestamp(change_step['finishedAt']) > timestamp(after_step['startedAt'])):
        raise ValueError('Google IAM steps were not ordered read/write/readback')
    before, changed, after = [step['output'].get('data') for step in completed]
    if not all(isinstance(policy, dict) for policy in (before, changed, after)):
        raise ValueError('Google IAM response bodies are unavailable')
    binding_counter(before.get('bindings'))
    expected = binding_counter(remove_runtime_grant(before['bindings']))
    if (binding_counter(changed.get('bindings')) != expected
            or binding_counter(after.get('bindings')) != expected):
        raise ValueError('Google IAM write/readback did not preserve the other permissions')
    body = change_step['input'].get('body')
    body = json.loads(body) if isinstance(body, str) else body
    if (not isinstance(body, dict) or not isinstance(before.get('etag'), str) or not before['etag']
            or body.get('etag') != before['etag'] or binding_counter(body.get('bindings')) != expected
            or not isinstance(after.get('etag'), str) or not after['etag']
            or changed.get('etag') != after['etag']):
        raise ValueError('Google IAM write/readback etags or submitted bindings do not agree')
    removed = has_grant(before)
    if removed and before['etag'] == after['etag']:
        raise ValueError('A permission removal must have a new Google policy etag')
    return {'iam_policy_change_verified': removed, 'permission_absence_verified': True,
            'grant_present_before': removed, 'etag_before': before['etag'], 'etag_after': after['etag']}


class CloudEvidence:
    """Read-only external verification. There is deliberately no cloud mutation method."""
    def __init__(self):
        result = subprocess.run([GCLOUD, f'--project={PROJECT}',
            f'--account={ACCOUNT}', 'auth', 'print-access-token'], capture_output=True,
            timeout=30, env={**os.environ, 'CLOUDSDK_PYTHON': PYTHON})
        if result.returncode:
            raise RuntimeError('Google sign-in is unavailable. Reauthenticate the configured Google account.')
        self.token = result.stdout.decode().strip()
        self.opener = urllib.request.build_opener(NoRedirect())

    def get(self, path, missing_ok=False):
        request = urllib.request.Request('https://storage.googleapis.com' + path,
            headers={'Authorization': 'Bearer ' + self.token})
        try:
            with self.opener.open(request, timeout=30) as response:
                data = response.read(2 * 1024 * 1024 + 1)
                if len(data) > 2 * 1024 * 1024:
                    raise RuntimeError('Google evidence exceeded its size limit')
                return json.loads(data)
        except urllib.error.HTTPError as error:
            if missing_ok and error.code == 404:
                return None
            raise RuntimeError(f'Google evidence read returned HTTP {error.code}') from None

    def metadata(self, target):
        if target.get('bucket') != BUCKET or not target.get('object', '').startswith('exports/'):
            raise ValueError('Export evidence is outside the isolated demo bucket')
        return self.get('/storage/v1/b/' + BUCKET + '/o/' + urllib.parse.quote(target['object'], safe=''), True)


def export_calls(response):
    return [call for call in response.get('calls', []) if call.get('name') == 'export_case_summary']


def native_denial(call):
    proof = call.get('resource_access', {})
    return (call.get('outcome') == 'failure' and call.get('execution_status') == 'denied_by_provider'
        and proof.get('status') == 'denied' and proof.get('provider') == 'google_cloud_storage'
        and proof.get('operation') == 'storage.objects.create' and proof.get('http_status') == 403
        and call.get('resource_accessed') == 'denied' and not call.get('resource') and not call.get('enforcement'))


class DemoRun:
    def __init__(self, stage, prompt=None, title=None):
        if stage not in ('ask', 'baseline', 'trigger', 'verify', 'restore'):
            raise ValueError('Choose ask, baseline, trigger, verify, or restore')
        prompt = prompt if prompt is not None else PROMPTS.get(stage, '')
        if not isinstance(prompt, str) or (stage != 'restore' and not 1 <= len(prompt.strip()) <= 4000):
            raise ValueError('Prompt must be 1 to 4000 characters')
        title = title or {'ask': 'Google agent conversation', 'baseline': 'Export before containment', 'trigger': 'Restricted customer lookup',
            'verify': 'Export after Elastic containment', 'restore': 'Restore export access'}[stage]
        if not isinstance(title, str) or not 1 <= len(title) <= 120:
            raise ValueError('Title must be 1 to 120 characters')
        self.id = str(uuid.uuid4())
        self.stage, self.prompt, self.title = stage, prompt, title
        self.directory = ROOT / 'runs' / self.id
        self.directory.mkdir(parents=True, mode=0o700)
        self.config = read_state()
        if not self.config:
            raise ValueError('Install the native response workflow first')
        self.kibana, self.es = Client(), Client('http://127.0.0.1:9200')
        self.state = {'id': self.id, 'stage': stage, 'status': 'running', 'phase': 'starting', 'events': [],
            'result': {'iam_policy_change_verified': False, 'data_plane_block_verified': False,
                'workflow_url': self.config['workflow_url'], 'restore_workflow_url': self.config['restore_workflow_url'],
                'rule_url': self.config['rule_url']}}

    def event(self, kind, message, **fields):
        self.state['phase'] = kind
        self.state['events'].append({'at': now(), 'type': kind, 'message': message, **fields})
        save(self.directory / 'status.json', self.state)

    def refresh_credentials(self):
        if (timestamp(self.config['token_expires_at']) - datetime.now(timezone.utc)).total_seconds() > 900:
            return
        self.event('credentials', 'Refreshing the scoped Google credential in the encrypted Elastic connector.')
        token = mint_access_token()
        expires = (datetime.now(timezone.utc) + timedelta(seconds=3500)).isoformat().replace('+00:00', 'Z')
        install_connector(self.kibana, token, RESPONSE_PRINCIPAL, expires)
        token = None
        self.config.update({'token_expires_at': expires, 'updated_at': now()})
        save(ROOT / 'state.json', self.config)

    def execution(self, execution_id):
        return self.kibana.request('GET', '/api/workflows/executions/' + urllib.parse.quote(execution_id, safe='') + '?includeInput=true&includeOutput=true')

    def wait_execution(self, execution_id, timeout=150):
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            detail = self.execution(execution_id)
            if detail.get('status') == 'completed':
                return detail
            if detail.get('status') in ('failed', 'cancelled', 'timed_out'):
                save(self.directory / 'failed-workflow.json', detail)
                raise RuntimeError('The native Workflow did not complete. Open its execution to inspect the Google HTTP step.')
            time.sleep(3)
        raise RuntimeError('The native Workflow is still running. Its state was saved; inspect it in Elastic.')

    def restore(self):
        self.event('restoring', 'Running the native Elastic restore workflow against Google IAM.')
        started = self.kibana.request('POST', '/api/workflows/workflow/' + self.config['restore_workflow_id'] + '/run', {'inputs': {}})
        execution_id = started.get('workflowExecutionId') or started.get('executionId') or started.get('id')
        if not execution_id:
            raise ValueError('Native Workflow did not return an execution ID')
        detail = self.wait_execution(execution_id)
        save(self.directory / 'restore-workflow.json', detail)
        policy = CloudEvidence().get('/storage/v1/b/' + BUCKET + '/iam?optionsRequestedPolicyVersion=3')
        if not has_grant(policy):
            raise ValueError('Google IAM did not confirm restored export permission')
        state = demo_state()
        state.pop('containment', None)
        state.pop('baseline', None)
        state['restore'] = {'job_id': self.id, 'workflow_execution_id': execution_id, 'at': now()}
        save(ROOT / 'demo_state.json', state)
        self.state['result'].update({'outcome': 'access_restored', 'iam_policy_change_verified': True,
            'data_plane_block_verified': False, 'workflow_execution_id': execution_id,
            'workflow_url': self.config['restore_workflow_url'] + '?tab=executions&executionId=' + execution_id,
            'message': 'Google accepted the restored export grant. An actual successful export confirms propagation.'})
        self.event('restored', 'Google IAM confirms the export grant is restored. Data-plane propagation is verified by the next export.')

    def invoke(self):
        self.event('agent', 'Sending your prompt to the live Google ADK agent. Its tool runs normally, without a custom hold or gate.')
        with (self.directory / 'invocation.json').open('wb') as output, (self.directory / 'invocation-error.log').open('wb') as errors:
            result = subprocess.run([str(DEMO / 'demo.sh'), 'invoke', '--title', self.title, '--prompt', self.prompt,
                '--client-request-id', self.id], stdout=output, stderr=errors, timeout=210)
        if result.returncode:
            raise RuntimeError('Google agent invocation failed. Diagnostics are saved in this run’s invocation-error.log.')
        invocation = json.loads((self.directory / 'invocation.json').read_text())
        response = invocation['response']
        if response.get('client_request_id') != self.id or response.get('executing_principal', {}).get('email') != RUNTIME:
            raise ValueError('Agent response does not match this request and runtime')
        if any(call.get('enforcement') for call in response.get('calls', [])):
            raise ValueError('The old application gate is still active; this is not native Google containment')
        self.state['run'] = {key: response.get(key) for key in ('run_id', 'session_id', 'prompt', 'answer', 'requester', 'executing_principal', 'calls')}
        self.state['result']['session_url'] = 'http://localhost:5601/app/security/entity_intelligence?' + urllib.parse.urlencode({
            'tab': 'explorer', 'scope': 'agents', 'agentSource': 'google_adk',
            'sessionId': json.dumps([AGENT_ID, response['session_id']], separators=(',', ':'))})
        self.event('agent_completed', 'The agent returned. Tool inputs, outputs and the authenticated requester are recorded.')
        return response

    def sync(self, response):
        self.event('importing', 'Importing this exact Google run and its native tool observations into Entity Intelligence.')
        with (self.directory / 'sync.log').open('wb') as log:
            result = subprocess.run([PYTHON, str(DEMO / 'sync_to_elastic.py'), '--once', '--run-id', response['run_id'],
                '--wait-lock-seconds', '120'], stdout=log, stderr=log, timeout=360)
        if result.returncode:
            raise RuntimeError('The agent ran, but ingestion needs attention. See this run’s sync.log.')

    def await_containment(self, response):
        self.event('detecting', 'Waiting for the saved AI policy to match the recorded customer-reference tool call.')
        source = None
        deadline = time.monotonic() + 150
        while time.monotonic() < deadline:
            hits = self.es.request('POST', '/' + self.config['event_index'] + '/_search', {'size': 10, 'query': {'bool': {'filter': [
                {'term': {'event.action': 'ai_policy_match'}}, {'term': {'entity_intelligence.control.id': self.config['policy_id']}},
                {'term': {'entity_intelligence.invocation.request_id': response['run_id']}},
                {'term': {'entity_intelligence.invocation.tool_name': 'read_customer_reference'}}]}}})['hits']['hits']
            if hits:
                source = hits[0]
                break
            time.sleep(3)
        if not source:
            raise RuntimeError('No matching saved-policy event was found for this run. Confirm the prompt used the customer-reference tool and the policy monitor is running.')
        self.event('policy_matched', 'The actual tool call matched the saved AI policy. Scheduling the native Elastic Security rule.')
        self.kibana.request('POST', '/internal/alerting/rule/' + self.config['rule_id'] + '/_run_soon', {}, '1')
        alert = None
        deadline = time.monotonic() + 180
        while time.monotonic() < deadline:
            alerts = self.es.request('POST', '/.alerts-security.alerts-default/_search', {'size': 10, 'query': {'bool': {'filter': [
                {'term': {'kibana.alert.rule.uuid': self.config['rule_id']}},
                {'term': {'kibana.alert.ancestors.id': source['_id']}}]}}})['hits']['hits']
            for candidate in alerts:
                if any(item.get('index') == source['_index'] and item.get('id') == source['_id'] for item in candidate['_source'].get('kibana.alert.ancestors', [])):
                    alert = candidate
                    break
            if alert:
                break
            time.sleep(3)
        if not alert:
            raise RuntimeError('The policy event is indexed, but the native Security rule has not produced its alert yet. Inspect the linked rule.')
        self.event('alert', 'Elastic Security created a real alert for this tool call. Its native Workflow is now taking the Google action.', alert_id=alert['_id'])
        detail = None
        deadline = time.monotonic() + 180
        query = urllib.parse.urlencode({'startedAfter': response['started_at'], 'size': 30, 'sortField': 'createdAt', 'sortOrder': 'desc'})
        while time.monotonic() < deadline:
            listing = self.kibana.request('GET', '/api/workflows/workflow/' + self.config['workflow_id'] + '/executions?' + query)
            items = listing.get('results', listing.get('executions', listing.get('data', [])))
            for item in items:
                candidate = self.execution(item['id'])
                event = candidate.get('context', {}).get('event', candidate.get('input', {}).get('event', {}))
                if any(a.get('_id') == alert['_id'] for a in event.get('alerts', [])):
                    detail = self.wait_execution(candidate['id'])
                    break
            if detail:
                break
            time.sleep(3)
        if not detail:
            raise RuntimeError('The alert exists, but its native Workflow execution was not found. Inspect the linked Workflow.')
        if detail.get('triggeredBy') != 'alert' or detail.get('isTestRun') is not False:
            raise ValueError('Expected a native alert-triggered production Workflow execution')
        permission_evidence = workflow_permission_evidence(detail, self.config['workflow_id'])
        policy = CloudEvidence().get('/storage/v1/b/' + BUCKET + '/iam?optionsRequestedPolicyVersion=3')
        if has_grant(policy):
            raise ValueError('Google still reports export access after the native Workflow')
        proof = {'workflow_execution': detail, 'alert': alert, 'source_event': source, 'bucket': BUCKET,
            'runtime': RUNTIME, 'credential_principal': RESPONSE_PRINCIPAL, 'job_id': self.id, 'response': response,
            'permission_evidence': permission_evidence}
        save(self.directory / 'containment.json', proof)
        state = demo_state()
        removed = permission_evidence['iam_policy_change_verified']
        reference = {'job_id': self.id, 'path': str(self.directory / 'containment.json'), 'at': now()}
        state['last_containment_confirmation'] = reference
        if removed:
            state['containment'] = reference
        else:
            # A fresh Baseline → Trigger is required before attributing a later
            # denial; this idempotent execution cannot prove a permission removal.
            state.pop('containment', None)
        save(ROOT / 'demo_state.json', state)
        message = ('Elastic Workflow removed the export grant through Google’s IAM API. Try an actual export to verify enforcement; IAM can take time to propagate.'
            if removed else 'The export grant was already absent. Elastic Workflow confirmed it remains absent; this run did not remove a permission. Use Baseline → Trigger for a new before/after export proof.')
        self.state['result'].update({'outcome': 'iam_changed' if removed else 'access_already_contained',
            'iam_policy_change_verified': removed, 'permission_absence_verified': True,
            'workflow_execution_id': detail['id'], 'workflow_url': self.config['workflow_url'] + '?tab=executions&executionId=' + detail['id'],
            'message': message})
        self.event('iam_changed' if removed else 'access_already_contained', message)

    def baseline(self, response):
        calls = export_calls(response)
        good = [call for call in calls if call.get('outcome') == 'success' and call.get('target', {}).get('bucket') == BUCKET and call.get('resource', {}).get('uri') == call.get('target', {}).get('uri')]
        if not good:
            if calls and all(native_denial(call) for call in calls):
                self.state['result'].update({'outcome': 'propagation_pending', 'google_http_status': 403,
                    'message': 'Google still denies the export after access was restored. IAM is propagating; retry the baseline shortly.'})
                self.event('propagation_pending', self.state['result']['message'])
                return
            raise ValueError('The prompt did not produce a successful export. Use the baseline export prompt.')
        cloud = CloudEvidence()
        for call in good:
            target = call['target']
            metadata = cloud.metadata(target)
            if not metadata or str(metadata.get('generation')) != str(call['resource'].get('generation')):
                raise ValueError('Successful export object generation could not be independently verified')
        proof = {'response': response, 'verified_at': now(), 'job_id': self.id}
        save(self.directory / 'baseline.json', proof)
        state = demo_state()
        state['baseline'] = {'job_id': self.id, 'path': str(self.directory / 'baseline.json'), 'at': now()}
        save(ROOT / 'demo_state.json', state)
        self.state['result'].update({'outcome': 'export_allowed', 'message': 'The live agent exported successfully. Google’s actual object generation was verified. Now trigger the protected lookup.'})
        self.event('export_allowed', self.state['result']['message'])

    def record_reply(self, response):
        """A free prompt has no expected tool or implied response attribution."""
        calls = response.get('calls', [])
        self.state['result'].update({'outcome': 'agent_completed',
            'provider_denials_observed': sum(native_denial(call) for call in calls),
            'message': 'Your prompt ran against the live Google agent and this run was imported into Elastic. '
                'Saved AI policies evaluate its recorded tools. This mode does not restore permissions or '
                'wait for a containment workflow; use the guided steps to verify the complete response chain.'})
        self.event('reply_recorded', self.state['result']['message'])

    def requester_risk_unavailable(self, error):
        save(self.directory / 'requester-risk-error.json', {
            'type': type(error).__name__, 'message': str(error), 'at': now()})
        self.state['result'].pop('entity_url', None)
        self.state['result']['entity_risk'] = {
            'status': 'unavailable',
            'message': 'Requester risk is unavailable for this run. Response and Google IAM evidence are reported separately; no risk change is claimed.'}
        self.event('requester_risk_unavailable', self.state['result']['entity_risk']['message'])

    def capture_requester_baseline(self):
        """Optional native risk context cannot prevent the real agent or containment from running."""
        try:
            self.event('requester_baseline', 'Capturing the verified requester’s native Entity Store risk before sending your prompt.')
            identity = requester_risk.current_requester(self.es)
            requester_risk.ensure_entity(self.kibana, identity)
            before = requester_risk.risk_snapshot(self.kibana, self.es, identity)
            save(self.directory / 'requester-risk-before.json', {'identity': identity, 'snapshot': before})
            self.state['result']['entity_risk'] = {'status': 'baseline_recorded'}
            return identity, before
        except Exception as error:
            self.requester_risk_unavailable(error)
            return None

    def capture_requester_result(self, response, baseline):
        if baseline is None:
            return
        try:
            identity, before = baseline
            requester_risk.verify_response_requester(response, identity)
            after = requester_risk.risk_snapshot(self.kibana, self.es, identity)
            before_summary, after_summary = requester_risk.summarize(before), requester_risk.summarize(after)
            if any(isinstance(item['score'], bool) or not isinstance(item['score'], (int, float))
                   or not math.isfinite(item['score']) for item in (before_summary, after_summary)):
                raise ValueError('Native risk snapshots did not contain comparable numeric scores')
            save(self.directory / 'requester-risk-after.json', {'identity': identity, 'snapshot': after})
            comparison = {'status': 'verified', 'identity': {'id': identity['id'], 'name': identity['name'],
                'subject': identity['subject']}, 'before': before_summary, 'after': after_summary,
                'score_delta': after_summary['score'] - before_summary['score'],
                'limitations': after['limitations']}
            save(self.directory / 'requester-risk-comparison.json', comparison)
            self.state['result'].update({'entity_url': requester_risk.entity_url(identity), 'entity_risk': comparison})
            self.event('requester_risk_updated', 'The live requester matches the stored identity. Native risk was recalculated from actual alerts; open the identity to inspect its contributors.')
        except Exception as error:
            self.requester_risk_unavailable(error)

    def verify(self, response):
        state = demo_state()
        if not state.get('baseline') or not state.get('containment'):
            raise ValueError('Run the successful baseline and trigger containment before verifying the block')
        calls = export_calls(response)
        if not calls:
            raise ValueError('The agent did not attempt export_case_summary. Use the export prompt to test the real action.')
        if any(call.get('outcome') == 'success' for call in calls):
            self.state['result'].update({'outcome': 'propagation_pending', 'iam_policy_change_verified': True,
                'message': 'This export succeeded. Google IAM has not enforced the change for this attempt. No block is claimed; retry Try export after propagation.'})
            self.event('propagation_pending', self.state['result']['message'])
            return
        if not all(native_denial(call) for call in calls):
            raise ValueError('The tool failed for a reason other than a proven Google Storage permission denial')
        cloud = CloudEvidence()
        absent = []
        for call in calls:
            target = call['target']
            if cloud.metadata(target) is not None:
                raise ValueError('The target object exists despite the recorded denial')
            absent.append({'tool_call_id': call['id'], 'uri': target['uri'], 'checked_at': now(), 'http_status': 404})
        receipt = {'response': response, 'containment': json.loads(Path(state['containment']['path']).read_text()),
            'baseline': json.loads(Path(state['baseline']['path']).read_text()), 'physical_output_absent': absent}
        save(self.directory / 'receipt.json', receipt)
        self.event('provider_denied', 'The actual Google upload returned HTTP 403 and its target object is absent. Verifying attribution to the native Workflow before claiming linked containment.')
        publisher = ROOT / 'publish_native_block.py'
        if not publisher.exists():
            raise RuntimeError('Physical denial is verified; its Entity Intelligence evidence publisher is not installed yet')
        self.event('publishing', 'Verifying the alert → Workflow → Google IAM → denied tool evidence and publishing the finding.')
        with (self.directory / 'publish.log').open('wb') as log:
            result = subprocess.run([PYTHON, str(publisher), '--run', str(self.directory / 'invocation.json'), '--receipt', str(self.directory / 'receipt.json'),
                '--output', str(self.directory / 'block-evidence.json'), '--wait-seconds', '60'], stdout=log, stderr=log, timeout=150)
        if result.returncode:
            raise RuntimeError('Google denial is verified, but publishing its correlated finding needs attention. See publish.log.')
        report = json.loads((self.directory / 'block-evidence.json').read_text())
        if (report.get('run_id') != response['run_id'] or report.get('session_id') != response['session_id']
                or report.get('workflow_execution_id') != receipt['containment']['workflow_execution']['id']
                or report.get('dry_run') is not False or not report.get('source_event_ids')):
            raise ValueError('The verified evidence report does not match this run and its containment workflow')
        self.state['evidence'] = report
        self.state['result'].update({'outcome': 'google_denied', 'iam_policy_change_verified': True,
            'data_plane_block_verified': True, 'google_http_status': 403,
            'workflow_execution_id': receipt['containment']['workflow_execution']['id'],
            'workflow_url': self.config['workflow_url'] + '?tab=executions&executionId=' + receipt['containment']['workflow_execution']['id'],
            'message': 'Google rejected the real export with HTTP 403. The exact target object is absent. The prior native Elastic Workflow IAM action and exact tool denial have been verified together.'})
        self.event('google_denied', self.state['result']['message'])
        if not report.get('alerts'):
            raise RuntimeError('Google denial and Workflow attribution are verified. The source evidence was published, but its blocked finding is not visible yet. Inspect the session and the existing export-blocked rule before retrying publication.')
        self.event('finding_ready', 'Elastic Security created the blocked finding from the verified source event. Open this agent session to inspect the exact denied tool call.')

    def run(self):
        with (ROOT / '.live-run.lock').open('a') as lock:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                self.state['status'] = 'error'
                self.event('error', 'Another native demo run is in progress.')
                return self.state
            try:
                self.refresh_credentials()
                if self.stage in ('baseline', 'restore'):
                    self.restore()
                if self.stage != 'restore':
                    if self.stage == 'verify' and (not demo_state().get('baseline') or not demo_state().get('containment')):
                        raise ValueError('First run a successful baseline and trigger containment.')
                    requester_baseline = self.capture_requester_baseline() if self.stage == 'trigger' else None
                    response = self.invoke()
                    self.sync(response)
                    if self.stage == 'baseline':
                        self.baseline(response)
                    elif self.stage == 'trigger':
                        self.await_containment(response)
                        self.capture_requester_result(response, requester_baseline)
                    elif self.stage == 'verify':
                        self.verify(response)
                    elif self.stage == 'ask':
                        self.record_reply(response)
                self.state['status'] = 'completed'
                self.event('completed', self.state['result'].get('message', 'Complete.'))
                state = demo_state()
                state.setdefault('last_runs', {})[self.stage] = self.id
                save(ROOT / 'demo_state.json', state)
            except Exception as error:
                self.state['status'] = 'error'
                self.event('error', str(error) if isinstance(error, (ValueError, RuntimeError)) else f'{type(error).__name__}: This run could not complete; local diagnostics are retained.')
            return self.state


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('stage', choices=['ask', 'baseline', 'trigger', 'verify', 'restore'])
    parser.add_argument('--prompt')
    parser.add_argument('--title')
    args = parser.parse_args()
    require_response_configuration()
    run = DemoRun(args.stage, args.prompt, args.title)
    print(json.dumps({'id': run.id, 'status_file': str(run.directory / 'status.json')}), flush=True)
    run.run()
    print(json.dumps({'status': run.state['status'], 'result': run.state.get('result'), 'last_event': run.state['events'][-1]}), flush=True)
    raise SystemExit(0 if run.state['status'] == 'completed' else 1)
