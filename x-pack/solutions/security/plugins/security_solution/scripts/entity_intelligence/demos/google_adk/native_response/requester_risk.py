"""Verified Google requester enrollment and native Entity Store risk snapshots."""
from __future__ import annotations

from datetime import datetime, timezone
import json
import re
from urllib.parse import urlencode

from setup_native_response import AGENT_ID, RUNTIME, PROJECT

SOURCE_INDEX = 'logs-google_adk.entity_intelligence-default'
ALERT_INDEX = '.alerts-security.alerts-default'
PROVENANCE = 'google_signed_id_token_verified_by_application'
VERSION = '2023-10-31'
PROMPT = ('I’m preparing the follow-up for CASE-001. Look up Example Customer A’s '
          'customer reference and tell me the reference number. Do not export anything.')


def identity_from_observation(hit):
    """Bind only the signed-token requester; owner and runtime are separate roles."""
    source = hit.get('_source', {})
    context = source.get('google_adk', {})
    requester = context.get('requester', {})
    email, subject = requester.get('email', ''), requester.get('subject', '')
    if (hit.get('_index') != SOURCE_INDEX or not hit.get('_id')
            or source.get('agent', {}).get('id') != AGENT_ID
            or context.get('project_id') != PROJECT
            or context.get('service_name') != 'ei-agent-demo'
            or context.get('runtime', {}).get('email') != RUNTIME
            or requester.get('authenticated') is not True
            or requester.get('principal_type') != 'google_account'
            or requester.get('provenance') != PROVENANCE
            or requester.get('human_identity') != 'account_level_only'
            or not isinstance(subject, str) or not re.fullmatch(r'[0-9]{10,30}', subject)
            or not isinstance(email, str) or not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', email)
            or email.endswith('.gserviceaccount.com')):
        raise ValueError('Expected an actual verified human-account requester from the isolated Google agent')
    # The native user definition currently has no Google namespace. Its id-first
    # scheme (without user.email) is also used by the existing native alerts.
    return {'id': 'user:' + subject + '@unknown', 'subject': subject, 'name': email,
            'source': PROVENANCE,
            'evidence': {'index': hit['_index'], 'id': hit['_id'],
                         'run_id': context.get('run_id'),
                         'session_id': source.get('session', {}).get('id')}}


def current_requester(es):
    result = es.request('POST', '/' + SOURCE_INDEX + '/_search', {
        'size': 1, 'sort': [{'@timestamp': 'desc'}],
        'query': {'bool': {'filter': [
            {'term': {'agent.id': AGENT_ID}}, {'term': {'event.action': 'session'}}]}}})
    hits = result.get('hits', {}).get('hits', [])
    if len(hits) != 1:
        raise ValueError('Import a real Google agent session before enrolling its requester')
    return identity_from_observation(hits[0])


def get_entity(kibana, identity):
    query = urlencode({'filter': 'entity.id: ' + json.dumps(identity['id']), 'size': 2})
    records = kibana.request('GET', '/api/security/entity_store/entities?' + query,
                             version=VERSION).get('entities', [])
    if len(records) > 1:
        raise ValueError('Entity Store returned more than one canonical identity')
    if not records:
        return None
    record = records[0]
    user = record.get('user', {})
    identifiers = user.get('id', [])
    identifiers = identifiers if isinstance(identifiers, list) else [identifiers]
    if (record.get('entity', {}).get('id') != identity['id']
            or identity['subject'] not in identifiers or user.get('name') != identity['name']):
        raise ValueError('The existing canonical identity conflicts with the verified requester; no overwrite performed')
    return record


def ensure_entity(kibana, identity):
    existing = get_entity(kibana, identity)
    if existing:
        return existing, False
    kibana.request('POST', '/api/security/entity_store/entities/user', {
        'user': {'id': [identity['subject']], 'name': identity['name']},
        'entity': {'id': identity['id'], 'name': identity['name'], 'type': 'Identity',
                   'EngineMetadata': {'Type': 'user'},
                   'source': [PROVENANCE]}}, version=VERSION)
    entity = get_entity(kibana, identity)
    if not entity:
        raise RuntimeError('Native API did not return the enrolled identity')
    return entity, True


def risk_snapshot(kibana, es, identity):
    result = kibana.request('POST', '/internal/risk_score/calculation/entity_v2', {
        'identifier': identity['name'], 'identifier_type': 'user', 'entity_id': identity['id']}, version='1')
    if result.get('success') is not True:
        raise RuntimeError('Native risk calculation did not confirm success')
    query = urlencode({'entity_type': 'user', 'entity_id': identity['id'], 'from': 'now-2h',
                       'score_type': 'base', 'include_contributions': 'true'})
    history = kibana.request('GET', '/api/risk_score/history?' + query, version=VERSION)
    if history.get('entity_id') != identity['id'] or history.get('entity_type') != 'user':
        raise ValueError('Native risk history belongs to a different identity')
    entries = sorted(history.get('entries', []), key=lambda entry: entry['@timestamp'], reverse=True)
    if not entries:
        raise RuntimeError('Native calculation has no visible history entry yet')
    latest = entries[0]
    inputs = latest.get('inputs', [])
    allowed = [item for item in inputs if item.get('index') == ALERT_INDEX and item.get('id')]
    alerts = []
    if allowed:
        response = es.request('POST', '/' + ALERT_INDEX + '/_search', {
            'size': len(allowed), 'query': {'bool': {'filter': [
                {'ids': {'values': [item['id'] for item in allowed]}},
                {'term': {'kibana.space_ids': 'default'}}]}}})
        if response.get('timed_out') or response.get('_shards', {}).get('failed', 0):
            raise RuntimeError('Native alert resolution was incomplete')
        alerts = response['hits']['hits']
    return {'captured_at': datetime.now(timezone.utc).isoformat(),
            'entity': get_entity(kibana, identity), 'latest_native_risk': latest,
            'resolved_contributor_alerts': alerts,
            'limitations': ['The native engine counts alerts, including multiple rules on the same action.',
                           'Risk history returns at most ten contributor inputs and uses at least one-hour buckets.',
                           'Current native user scoring excludes event.outcome=failure, including these blocked exports.']}


def summarize(snapshot):
    risk = snapshot['latest_native_risk']
    return {'score': risk.get('calculated_score_norm'), 'level': risk.get('calculated_level'),
            'scored_alerts': risk.get('category_1_count'),
            'returned_contributors': len(risk.get('inputs', []))}



def entity_url(identity):
    return 'http://localhost:5601/app/security/entity_intelligence?' + urlencode({
        'tab': 'explorer', 'scope': 'entities', 'entityId': identity['id']})


def verify_response_requester(response, identity):
    requester = response.get('requester', {})
    if (requester.get('subject') != identity['subject']
            or requester.get('email') != identity['name']
            or requester.get('authenticated') is not True
            or requester.get('principal_type') != 'google_account'
            or requester.get('provenance') != PROVENANCE
            or requester.get('human_identity') != 'account_level_only'
            or response.get('executing_principal', {}).get('email') != RUNTIME):
        raise ValueError('This run does not match the verified requester used for the native risk baseline')
