/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  connectorsSpecs,
  isSelectedActionEnabled,
  type SelectedActions,
} from '@kbn/connector-specs';
import type {
  AlertRef,
  CheckResult,
  IdentityProposal,
  ResolveResult,
  UntrackableReason,
} from '../types';
import { LOCAL_CONNECTOR_ID } from '../types';
import type { AdapterContext, ProviderAdapter } from './types';

export const ELASTICSEARCH_CONNECTOR_TYPE_ID = connectorsSpecs.Elasticsearch.metadata.id;

/** Matches the dot-prefixed, hidden alert aliases without `expand_wildcards`. */
const ALERTS_INDEX = '.alerts-*';
const SEARCH_SUB_ACTION = 'search';
/** Active alerts are rewritten on every rule run; one untouched for a day is an orphan. */
export const STALE_AFTER_MS = 24 * 60 * 60_000;
/** Slack posts and alert writes come from different clocks and queues. */
const POST_TIME_TOLERANCE_MS = 2 * 60_000;
const MAX_RESOLVE_CANDIDATES = 20;
const CHECK_CHUNK_SIZE = 100;

const FIELDS = {
  uuid: 'kibana.alert.uuid',
  instanceId: 'kibana.alert.instance.id',
  ruleId: 'kibana.alert.rule.uuid',
  ruleName: 'kibana.alert.rule.name',
  ruleTypeId: 'kibana.alert.rule.rule_type_id',
  status: 'kibana.alert.status',
  start: 'kibana.alert.start',
  end: 'kibana.alert.end',
  timestamp: '@timestamp',
} as const;

interface AlertDoc {
  uuid?: string;
  instanceId?: string;
  ruleId?: string;
  ruleName?: string;
  ruleTypeId?: string;
  status?: string;
  start?: string;
  end?: string;
  timestamp?: string;
}

/** Reads a field stored either flat (`"kibana.alert.uuid"`) or nested, as alert indices allow both. */
const readField = (source: Record<string, unknown>, path: string): string | undefined => {
  const flat = source[path];
  if (typeof flat === 'string') return flat;
  let current: unknown = source;
  for (const part of path.split('.')) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : undefined;
};

const toAlertDoc = (source: Record<string, unknown>): AlertDoc => ({
  uuid: readField(source, FIELDS.uuid),
  instanceId: readField(source, FIELDS.instanceId),
  ruleId: readField(source, FIELDS.ruleId),
  ruleName: readField(source, FIELDS.ruleName),
  ruleTypeId: readField(source, FIELDS.ruleTypeId),
  status: readField(source, FIELDS.status),
  start: readField(source, FIELDS.start),
  end: readField(source, FIELDS.end),
  timestamp: readField(source, FIELDS.timestamp),
});

const isAccessError = (message: string) =>
  /authentication failed|access denied|security_exception|unauthorized|forbidden|\b40[13]\b/i.test(
    message
  );

class ConnectorSearchError extends Error {}

/** Runs the connector's read-only `search` action and returns the hits' sources. */
const searchAlerts = async (
  { actionsClient }: AdapterContext,
  connectorId: string,
  query: Record<string, unknown>,
  size: number
): Promise<AlertDoc[]> => {
  const result = await actionsClient.execute({
    actionId: connectorId,
    params: {
      subAction: SEARCH_SUB_ACTION,
      subActionParams: {
        index: ALERTS_INDEX,
        query,
        size,
        _source: Object.values(FIELDS),
        sort: [{ [FIELDS.timestamp]: { order: 'desc' } }],
      },
    },
  });
  if (result.status === 'error') {
    throw new ConnectorSearchError(result.serviceMessage ?? result.message ?? 'unknown error');
  }
  const hits = (result.data as { hits?: { hits?: Array<{ _source?: unknown }> } } | undefined)?.hits
    ?.hits;
  return (hits ?? []).flatMap(({ _source: source }) =>
    source && typeof source === 'object' ? [toAlertDoc(source as Record<string, unknown>)] : []
  );
};

/** The connector, when it is an External Elasticsearch connector whose `search` action is on. */
const readableConnector = async (
  { actionsClient }: AdapterContext,
  connectorId: string
): Promise<{ ok: true } | { ok: false; detail: string }> => {
  try {
    const connector = await actionsClient.get({ id: connectorId });
    if (connector.actionTypeId !== ELASTICSEARCH_CONNECTOR_TYPE_ID) {
      return { ok: false, detail: `connector type ${connector.actionTypeId} cannot read alerts` };
    }
    const selectedActions = connector.config?.selectedActions as SelectedActions;
    if (!isSelectedActionEnabled(SEARCH_SUB_ACTION, selectedActions)) {
      return { ok: false, detail: 'the connector has its search action turned off' };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : String(error) };
  }
};

const identityQuery = (proposal: IdentityProposal): Record<string, unknown> | undefined => {
  if (proposal.alert_id) {
    return { bool: { filter: [{ term: { [FIELDS.uuid]: proposal.alert_id } }] } };
  }
  if (proposal.rule_id && proposal.instance_key) {
    return {
      bool: {
        filter: [
          { term: { [FIELDS.ruleId]: proposal.rule_id } },
          { term: { [FIELDS.instanceId]: proposal.instance_key } },
        ],
      },
    };
  }
  return undefined;
};

/** Whether the alert was active when the post arrived, within clock tolerance. */
export const wasActiveAt = (doc: AlertDoc, postReceivedAt: string): boolean => {
  const post = Date.parse(postReceivedAt);
  const start = doc.start ? Date.parse(doc.start) : NaN;
  if (Number.isNaN(post) || Number.isNaN(start)) return false;
  if (start > post + POST_TIME_TOLERANCE_MS) return false;
  if (!doc.end) return true;
  const end = Date.parse(doc.end);
  return Number.isNaN(end) || end >= post - POST_TIME_TOLERANCE_MS;
};

const untrackable = (reason: UntrackableReason, detail?: string): ResolveResult => ({
  untrackable: reason,
  ...(detail ? { detail: detail.slice(0, 500) } : {}),
});

/** Maps one alert document to a check result. */
export const toCheckResult = (doc: AlertDoc | undefined, now: number): CheckResult => {
  if (!doc) return { status: 'unknown' };
  const updatedAt = doc.timestamp;
  if (doc.status === 'recovered') {
    return {
      status: 'recovered',
      ...(doc.end ? { recovered_at: doc.end } : {}),
      ...(updatedAt ? { updated_at: updatedAt } : {}),
    };
  }
  if (doc.status === 'untracked') {
    return { status: 'unknown', stop: 'untracked_by_source' };
  }
  const updated = updatedAt ? Date.parse(updatedAt) : NaN;
  if (!Number.isNaN(updated) && now - updated > STALE_AFTER_MS) {
    return { status: 'stale', updated_at: updatedAt };
  }
  return { status: 'firing', ...(updatedAt ? { updated_at: updatedAt } : {}) };
};

/**
 * Kibana alerts on a remote cluster, read through an External Elasticsearch (`.elasticsearch`)
 * connector. Local alerts are out of scope until the Nightshift service accounts can read
 * `.alerts-*`.
 */
export const elasticAlertsAdapter: ProviderAdapter = {
  source: 'elastic',

  async resolve(proposal, { postReceivedAt }, context) {
    const connectorId = proposal.connector_id;
    if (!connectorId || connectorId === LOCAL_CONNECTOR_ID) {
      return untrackable('no_readable_connector', 'alerts on this cluster are not readable yet');
    }
    const query = identityQuery(proposal);
    if (!query) return untrackable('insufficient_identity');
    const connector = await readableConnector(context, connectorId);
    if (!connector.ok) return untrackable('no_readable_connector', connector.detail);

    let docs: AlertDoc[];
    try {
      docs = await searchAlerts(context, connectorId, query, MAX_RESOLVE_CANDIDATES);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return untrackable(
        isAccessError(message) ? 'access_denied' : 'no_readable_connector',
        message
      );
    }
    if (docs.length === 0) return untrackable('not_found');

    const active = docs.filter((doc) => doc.uuid && wasActiveAt(doc, postReceivedAt));
    const uuids = new Set(active.map(({ uuid }) => uuid));
    if (uuids.size === 0) return untrackable('inconsistent_timing');
    if (uuids.size > 1) return untrackable('ambiguous', `${uuids.size} alerts were active`);

    const [doc] = active;
    const ref: AlertRef = {
      source: 'elastic',
      connector_id: connectorId,
      alert_uuid: doc.uuid!,
      ...(doc.instanceId ? { instance_id: doc.instanceId } : {}),
      ...(doc.ruleId ? { rule_id: doc.ruleId } : {}),
      ...(doc.ruleName ? { rule_name: doc.ruleName } : {}),
      ...(doc.ruleTypeId ? { rule_type_id: doc.ruleTypeId } : {}),
      ...(doc.start ? { alert_start: doc.start } : {}),
    };
    return { ref };
  },

  async check(refs, context, now) {
    const results = new Map<string, CheckResult>();
    const byConnector = new Map<string, AlertRef[]>();
    for (const ref of refs) {
      byConnector.set(ref.connector_id, [...(byConnector.get(ref.connector_id) ?? []), ref]);
    }
    for (const [connectorId, connectorRefs] of byConnector) {
      for (let i = 0; i < connectorRefs.length; i += CHECK_CHUNK_SIZE) {
        const chunk = connectorRefs.slice(i, i + CHECK_CHUNK_SIZE);
        const uuids = chunk.map(({ alert_uuid: uuid }) => uuid);
        try {
          const docs = await searchAlerts(
            context,
            connectorId,
            { bool: { filter: [{ terms: { [FIELDS.uuid]: uuids } }] } },
            uuids.length * 2
          );
          // Sorted newest first, so the first document of a uuid is its latest state.
          const latest = new Map<string, AlertDoc>();
          for (const doc of docs) {
            if (doc.uuid && !latest.has(doc.uuid)) latest.set(doc.uuid, doc);
          }
          for (const uuid of uuids) results.set(uuid, toCheckResult(latest.get(uuid), now));
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          for (const uuid of uuids) results.set(uuid, { status: 'error', message });
        }
      }
    }
    return results;
  },
};
