/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer, SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { asSpaceId } from '@kbn/core-spaces-common';
import { isNotFoundError } from '@kbn/es-errors';
import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { DEFAULT_ALERTS_INDEX } from '../../../../common/constants';
import { MAX_ALERT_IDS } from '../../../../common/workflows/step_types/common/constants';
import { DEFAULT_MAX_ENTITIES } from '../../../../common/workflows/step_types/get_alert_entities_step/get_alert_entities_step_common';
import { getAlertEntities } from '../get_alert_entities_step/get_alert_entities';
import type { AttackSignals, Disposition, InvestigationMeta, StoredFingerprint } from './cluster';
import { FingerprintIndexUnscopedError } from './fingerprint_index_unscoped_error';
import {
  FINGERPRINT_TTL_MS,
  STORED_ALERT_ID_CAP,
  alertOverlap,
  bestStoredForGroup,
  chainSpan,
  clusterNewAttacks,
  disposition,
  fingerprintId,
  hostUserPair,
  investigationStillPending,
  journalAlertsRetired,
  sameAttack,
  tagCorrelatedAlerts,
  uniqueSorted,
} from './cluster';

export const ATTACK_FINGERPRINT_AI_INDEX_ID = 'security-attack-fingerprints';
export const ATTACK_FINGERPRINT_INDEX = `ai-index-idx-${ATTACK_FINGERPRINT_AI_INDEX_ID}`;
export const ATTACK_FINGERPRINT_TYPE = 'security.attack_fingerprint';
export const ATTACK_FINGERPRINT_TAG = 'consumer:attack-discovery';

/**
 * The fingerprint index was not searched. A missing privilege used to look the
 * same as no stored fingerprints. The handler still reviews every attack. It
 * does not write a fingerprint for a read that never happened.
 */
export class FingerprintIndexUnreadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FingerprintIndexUnreadError';
  }
}

const SEARCH_SIZE = 100;
const SEARCH_PAGE_CAP = 20;
const ENRICH_CONCURRENCY = 4;
const TERMS_CAP = 100;
const EXTEND_ATTEMPTS = 3;

export interface MatchReview {
  attack_discovery_id: string;
  title: string;
  alert_ids: string[];
  summary_markdown: string;
  related_investigation_id: string;
  sibling_alert_ids: string[];
  sibling_attack_discovery_ids: string[];
}

/**
 * Set from AlertZero startup. False when the fingerprint template was not installed, so the
 * worker's first write must not auto-create the index from the generic template.
 */
let fingerprintCreateAllowed = true;

export const setFingerprintCreateAllowed = (allowed: boolean): void => {
  fingerprintCreateAllowed = allowed;
};

export interface MatchAttachment {
  attack_discovery_id: string;
  title: string;
  alert_ids: string[];
  summary_markdown: string;
  investigation_id: string;
  journal_alerts_retired: boolean;
  tag_correlated_alerts: boolean;
}

export interface MatchAttackFingerprintsOutput {
  reviews: MatchReview[];
  attachments: MatchAttachment[];
}

const stringField = (raw: Record<string, unknown>, key: string): string => {
  const value = raw[key];
  return typeof value === 'string' ? value : '';
};

const preferFilled = (preferred: string, fallback: string): string =>
  preferred.length > 0 ? preferred : fallback;

/**
 * The name on the alert, not the entity id. `host.id` is preferred by the entity id and can be
 * the same value on unrelated machines, which would group their attacks. A missing name keeps
 * the id so an alert with no `host.name` or `user.name` can still match.
 */
const entityKey = (entity: { id: string; name?: string }): string => {
  const name = entity.name?.trim();
  return name !== undefined && name.length > 0 ? name : entity.id;
};

const stringList = (raw: Record<string, unknown>, key: string): string[] => {
  const value = raw[key];
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
};

const asStringList = (value: unknown): string[] => {
  if (typeof value === 'string' && value.length > 0) {
    return [value];
  }
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
};

const errorText = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);
  const body =
    typeof error === 'object' && error !== null && 'body' in error
      ? JSON.stringify((error as { body: unknown }).body)
      : '';
  return `${message} ${body}`;
};

const statusCode = (error: unknown): number | undefined => {
  if (typeof error === 'object' && error !== null && 'statusCode' in error) {
    const code = (error as { statusCode?: unknown }).statusCode;
    return typeof code === 'number' ? code : undefined;
  }
  return undefined;
};

const isConflict = (error: unknown): boolean =>
  statusCode(error) === 409 || /version_conflict_engine_exception/i.test(errorText(error));

const parseAttack = (raw: Record<string, unknown>): AttackSignals | undefined => {
  const attackId = stringField(raw, 'kibana.alert.uuid');
  if (attackId.length === 0) {
    return undefined;
  }
  return {
    attackId,
    alertIds: stringList(raw, 'kibana.alert.attack_discovery.alert_ids'),
    title: stringField(raw, 'kibana.alert.attack_discovery.title'),
    summaryMarkdown: stringField(raw, 'kibana.alert.attack_discovery.summary_markdown'),
    fingerprintTitle: preferFilled(
      stringField(raw, 'kibana.alert.attack_discovery.title_with_replacements'),
      stringField(raw, 'kibana.alert.attack_discovery.title')
    ),
    fingerprintSummary: preferFilled(
      stringField(raw, 'kibana.alert.attack_discovery.summary_markdown_with_replacements'),
      stringField(raw, 'kibana.alert.attack_discovery.summary_markdown')
    ),
    tactics: stringList(raw, 'kibana.alert.attack_discovery.mitre_attack_tactics'),
    hostEntityIds: [],
    userEntityIds: [],
  };
};

const mapPool = async <T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> => {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index]);
    }
  };
  const workers = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
};

const readAlertSpan = async (
  esClient: ElasticsearchClient,
  spaceId: string,
  alertIds: readonly string[],
  abortSignal: AbortSignal | undefined
): Promise<{ first?: string; last?: string }> => {
  if (alertIds.length === 0) {
    return {};
  }
  const response = await esClient.search(
    {
      index: `${DEFAULT_ALERTS_INDEX}-${asSpaceId(spaceId)}`,
      size: 0,
      expand_wildcards: ['open', 'hidden'],
      query: { ids: { values: [...alertIds.slice(0, MAX_ALERT_IDS)] } },
      aggs: {
        first: { min: { field: '@timestamp' } },
        last: { max: { field: '@timestamp' } },
      },
    },
    { signal: abortSignal }
  );
  const aggs = response.aggregations as
    | { first?: { value_as_string?: string }; last?: { value_as_string?: string } }
    | undefined;
  return { first: aggs?.first?.value_as_string, last: aggs?.last?.value_as_string };
};

const enrichAttack = async (
  attack: AttackSignals,
  esClient: ElasticsearchClient,
  spaceId: string,
  abortSignal: AbortSignal | undefined,
  logger: StepHandlerContext['logger']
): Promise<AttackSignals> => {
  const alertIds = attack.alertIds.slice(0, MAX_ALERT_IDS);
  if (alertIds.length === 0) {
    return attack;
  }
  const [entities, span, entityPairs] = await Promise.all([
    getAlertEntities({
      abortSignal,
      alertIds,
      entityTypes: ['host', 'user'],
      esClient,
      maxEntities: DEFAULT_MAX_ENTITIES,
      spaceId,
    }).catch((error: unknown) => {
      logger.warn(
        `Attack fingerprint entity resolution failed for ${attack.attackId}: ${errorText(error)}`
      );
      return {
        entities: [] as Array<{ id: string; name?: string; type: 'host' | 'service' | 'user' }>,
        total: 0,
        truncated: false,
      };
    }),
    readAlertSpan(esClient, spaceId, alertIds, abortSignal).catch((error: unknown) => {
      if (!isNotFoundError(error)) {
        logger.warn(
          `Attack fingerprint alert times failed for ${attack.attackId}: ${errorText(error)}`
        );
      }
      return { first: undefined, last: undefined };
    }),
    readEntityPairs(esClient, spaceId, alertIds, abortSignal).catch((error: unknown) => {
      logger.warn(
        `Attack fingerprint host and user pairs failed for ${attack.attackId}: ${errorText(error)}`
      );
      return [] as string[];
    }),
  ]);

  return {
    ...attack,
    hostEntityIds: entities.entities.filter((entity) => entity.type === 'host').map(entityKey),
    userEntityIds: entities.entities.filter((entity) => entity.type === 'user').map(entityKey),
    entityPairs,
    firstAlertAt: span.first,
    lastAlertAt: span.last,
  };
};

const fieldStrings = (fields: Record<string, unknown>, key: string): string[] => {
  const value = fields[key];
  const list = Array.isArray(value) ? value : [];
  return list.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
};

/** Host and user names from each alert, paired only within that alert. */
const readEntityPairs = async (
  esClient: ElasticsearchClient,
  spaceId: string,
  alertIds: readonly string[],
  abortSignal: AbortSignal | undefined
): Promise<string[]> => {
  if (alertIds.length === 0) {
    return [];
  }
  const response = await esClient.search(
    {
      index: `${DEFAULT_ALERTS_INDEX}-${asSpaceId(spaceId)}`,
      size: alertIds.length,
      expand_wildcards: ['open', 'hidden'],
      _source: false,
      fields: ['host.name', 'user.name'],
      query: { ids: { values: [...alertIds] } },
    },
    { signal: abortSignal }
  );
  const pairs: string[] = [];
  for (const hit of response.hits?.hits ?? []) {
    const fields = (hit.fields ?? {}) as Record<string, unknown>;
    const hosts = fieldStrings(fields, 'host.name');
    const users = fieldStrings(fields, 'user.name');
    for (const host of hosts) {
      for (const user of users) {
        pairs.push(hostUserPair(host.trim(), user.trim()));
      }
    }
  }
  return uniqueSorted(pairs).slice(0, STORED_ALERT_ID_CAP);
};

const toStored = (hit: {
  _id?: string;
  _seq_no?: number;
  _primary_term?: number;
  _source?: Record<string, unknown>;
}): StoredFingerprint | undefined => {
  const source = hit._source ?? {};
  const attributes = (source.attributes ?? {}) as Record<string, unknown>;
  const investigationId =
    typeof attributes.investigation_id === 'string' ? attributes.investigation_id : '';
  if (investigationId.length === 0) {
    return undefined;
  }
  return {
    id: typeof source.id === 'string' ? source.id : hit._id ?? '',
    investigationId,
    alertIds: asStringList(attributes.alert_ids),
    hostEntityIds: asStringList(attributes.host_entity_ids),
    userEntityIds: asStringList(attributes.user_entity_ids),
    entityPairs: asStringList(attributes.entity_pairs),
    tactics: asStringList(attributes.mitre_attack_tactics),
    firstAlertAt:
      typeof attributes.first_alert_at === 'string' ? attributes.first_alert_at : undefined,
    lastAlertAt:
      typeof attributes.last_alert_at === 'string' ? attributes.last_alert_at : undefined,
    expiresAt: typeof source.expires_at === 'string' ? source.expires_at : undefined,
    writtenAt: typeof source['@timestamp'] === 'string' ? source['@timestamp'] : undefined,
    alertCount: typeof attributes.alert_count === 'number' ? attributes.alert_count : undefined,
    seqNo: hit._seq_no,
    primaryTerm: hit._primary_term,
  };
};

const chunkTerms = (values: readonly string[]): string[][] => {
  const chunks: string[][] = [];
  for (let index = 0; index < values.length; index += TERMS_CAP) {
    chunks.push(values.slice(index, index + TERMS_CAP));
  }
  return chunks;
};

const attributeQueries = (
  spaceId: string,
  attacks: readonly AttackSignals[],
  now: string
): QueryDslQueryContainer[] => {
  const fields = [
    ['attributes.host_entity_ids', uniqueSorted(attacks.flatMap((item) => item.hostEntityIds))],
    ['attributes.user_entity_ids', uniqueSorted(attacks.flatMap((item) => item.userEntityIds))],
    ['attributes.entity_pairs', uniqueSorted(attacks.flatMap((item) => item.entityPairs ?? []))],
    ['attributes.alert_ids', uniqueSorted(attacks.flatMap((item) => item.alertIds))],
  ] as const;
  return fields.flatMap(([field, values]) =>
    chunkTerms(values).map((chunk) => ({
      bool: {
        filter: [
          { term: { type: ATTACK_FINGERPRINT_TYPE } },
          { term: { 'attributes.space_id': spaceId } },
          { range: { expires_at: { gt: now } } },
          { terms: { [field]: chunk } },
        ],
      },
    }))
  );
};

const searchFingerprints = async (
  esClient: ElasticsearchClient,
  spaceId: string,
  attacks: readonly AttackSignals[],
  now: string,
  abortSignal: AbortSignal | undefined,
  logger: StepHandlerContext['logger']
): Promise<StoredFingerprint[]> => {
  const hosts = attacks.some((item) => item.hostEntityIds.length > 0);
  const users = attacks.some((item) => item.userEntityIds.length > 0);
  const alerts = attacks.some((item) => item.alertIds.length > 0);
  if (!hosts && !users && !alerts) {
    return [];
  }

  const byId = new Map<string, StoredFingerprint>();
  for (const query of attributeQueries(spaceId, attacks, now)) {
    let searchAfter: SortResults | undefined;
    for (let page = 0; page < SEARCH_PAGE_CAP; page++) {
      let response: Awaited<ReturnType<ElasticsearchClient['search']>>;
      try {
        response = await esClient.search(
          {
            index: ATTACK_FINGERPRINT_INDEX,
            seq_no_primary_term: true,
            size: SEARCH_SIZE,
            sort: [{ expires_at: { order: 'desc' } }, { id: { order: 'asc' } }],
            ...(searchAfter === undefined ? {} : { search_after: searchAfter }),
            query,
          },
          { signal: abortSignal }
        );
      } catch (error) {
        // A missing index is a first run: there are no fingerprints to match.
        // Any other failure, including a missing privilege, was not a search.
        if (isNotFoundError(error)) {
          return [];
        }
        logger.warn(`Attack fingerprint search failed: ${errorText(error)}`);
        throw new FingerprintIndexUnreadError(errorText(error));
      }
      // No shards means the index was skipped rather than searched. That is how a
      // missing privilege used to come back as an empty, successful response.
      if (response._shards?.total === 0) {
        logger.warn('Attack fingerprint search read no shards');
        throw new FingerprintIndexUnreadError('Attack fingerprint index was not read');
      }
      const hits = response.hits?.hits ?? [];
      for (const hit of hits) {
        const stored = toStored(hit as { _id?: string; _source?: Record<string, unknown> });
        if (stored !== undefined) {
          byId.set(stored.id, stored);
        }
      }
      if (hits.length < SEARCH_SIZE) {
        break;
      }
      const sort = hits[hits.length - 1]?.sort;
      if (sort === undefined) {
        break;
      }
      searchAfter = sort;
    }
  }
  return [...byId.values()];
};

const fingerprintDocument = (
  attack: AttackSignals,
  documentId: string,
  spaceId: string,
  investigationId: string,
  parentRunId: string | undefined,
  now: Date
) => {
  const last = attack.lastAlertAt === undefined ? Number.NaN : Date.parse(attack.lastAlertAt);
  const expiresAt = new Date(
    (Number.isNaN(last) ? now.getTime() : last) + FINGERPRINT_TTL_MS
  ).toISOString();
  return {
    '@timestamp': now.toISOString(),
    id: documentId,
    type: ATTACK_FINGERPRINT_TYPE,
    title: (attack.fingerprintTitle ?? attack.title).slice(0, 512),
    tags: [ATTACK_FINGERPRINT_TAG],
    expires_at: expiresAt,
    // Context Engine shows a document with no privileges element in every space.
    permissions: { kibana: { privileges: [{ space: spaceId }] } },
    attributes: {
      space_id: spaceId,
      investigation_id: investigationId,
      attack_discovery_id: attack.attackId,
      alert_ids: uniqueSorted(attack.alertIds).slice(0, STORED_ALERT_ID_CAP),
      alert_count: attack.alertIds.length,
      host_entity_ids: uniqueSorted(attack.hostEntityIds).slice(0, STORED_ALERT_ID_CAP),
      user_entity_ids: uniqueSorted(attack.userEntityIds).slice(0, STORED_ALERT_ID_CAP),
      entity_pairs: uniqueSorted(attack.entityPairs ?? []).slice(0, STORED_ALERT_ID_CAP),
      mitre_attack_tactics: uniqueSorted(attack.tactics).slice(0, STORED_ALERT_ID_CAP),
      first_alert_at: attack.firstAlertAt ?? '',
      last_alert_at: attack.lastAlertAt ?? '',
      status: 'open',
      parent_run_id: parentRunId ?? '',
    },
  };
};

/**
 * Writes the fingerprint with `op_type: create`. A 409 means that document id is taken.
 * The caller attaches only when the existing record is still a match it should join.
 * `distinctKey` gives a new review its own document when the canonical id belongs to
 * a fingerprint this run must not join.
 */
const createFingerprint = async (
  esClient: ElasticsearchClient,
  group: readonly AttackSignals[],
  spaceId: string,
  investigationId: string,
  parentRunId: string | undefined,
  now: Date,
  abortSignal: AbortSignal | undefined,
  logger: StepHandlerContext['logger'],
  distinctKey?: string
): Promise<{ conflict: boolean }> => {
  const canonical = group[0];
  if (canonical === undefined) {
    return { conflict: false };
  }
  const span = chainSpan(group);
  const id = fingerprintId(spaceId, canonical, distinctKey);
  try {
    await esClient.index(
      {
        index: ATTACK_FINGERPRINT_INDEX,
        id,
        op_type: 'create',
        document: fingerprintDocument(span, id, spaceId, investigationId, parentRunId, now),
      },
      { signal: abortSignal }
    );
    return { conflict: false };
  } catch (error) {
    if (isConflict(error)) {
      return { conflict: true };
    }
    logger.warn(`Attack fingerprint write failed for ${canonical.attackId}: ${errorText(error)}`);
    return { conflict: false };
  }
};

/**
 * A create conflict is the race for one fingerprint only when this run was about to
 * open a new review and the stored record still matches across runs. A closed false
 * positive with new alerts and a host-only repeat keep the decision `disposition`
 * already made. A missing Investigation is the same race while the fingerprint is
 * still new, and an orphan once that window has passed.
 */
const canAdoptConflict = (
  decision: Disposition,
  stored: StoredFingerprint | undefined,
  investigation: InvestigationMeta | undefined,
  group: readonly AttackSignals[],
  now: Date
): stored is StoredFingerprint =>
  decision.kind === 'review' &&
  stored !== undefined &&
  (investigation !== undefined || investigationStillPending(stored, now)) &&
  !(
    investigation?.status === 'closed' &&
    investigation.closeReason === 'false_positive' &&
    !group.some((member) => alertOverlap(member.alertIds, stored.alertIds))
  ) &&
  group.some((member) => sameAttack(member, stored, false));

const extensionDoc = (current: StoredFingerprint, span: AttackSignals, now: Date) => {
  const lastMs = span.lastAlertAt === undefined ? Number.NaN : Date.parse(span.lastAlertAt);
  const expiresAt = new Date(
    (Number.isNaN(lastMs) ? now.getTime() : lastMs) + FINGERPRINT_TTL_MS
  ).toISOString();
  const nextExpires =
    current.expiresAt !== undefined && current.expiresAt > expiresAt
      ? current.expiresAt
      : expiresAt;
  const firstAlertAt = [current.firstAlertAt, span.firstAlertAt]
    .filter((value): value is string => value !== undefined && value.length > 0)
    .sort()[0];
  const lastAlertAt = [current.lastAlertAt, span.lastAlertAt]
    .filter((value): value is string => value !== undefined && value.length > 0)
    .sort()
    .at(-1);
  const alertIds = uniqueSorted([...current.alertIds, ...span.alertIds]);
  const storedIds = new Set(current.alertIds);
  const added = uniqueSorted(span.alertIds).filter((id) => !storedIds.has(id)).length;
  return {
    expires_at: nextExpires,
    attributes: {
      alert_ids: alertIds.slice(0, STORED_ALERT_ID_CAP),
      alert_count: (current.alertCount ?? current.alertIds.length) + added,
      host_entity_ids: uniqueSorted([...current.hostEntityIds, ...span.hostEntityIds]).slice(
        0,
        STORED_ALERT_ID_CAP
      ),
      user_entity_ids: uniqueSorted([...current.userEntityIds, ...span.userEntityIds]).slice(
        0,
        STORED_ALERT_ID_CAP
      ),
      entity_pairs: uniqueSorted([
        ...(current.entityPairs ?? []),
        ...(span.entityPairs ?? []),
      ]).slice(0, STORED_ALERT_ID_CAP),
      mitre_attack_tactics: uniqueSorted([...current.tactics, ...span.tactics]).slice(
        0,
        STORED_ALERT_ID_CAP
      ),
      first_alert_at: firstAlertAt ?? '',
      last_alert_at: lastAlertAt ?? '',
    },
  };
};

const readStoredFingerprint = async (
  esClient: ElasticsearchClient,
  id: string,
  abortSignal: AbortSignal | undefined
): Promise<StoredFingerprint | undefined> => {
  const response = await esClient.get(
    { index: ATTACK_FINGERPRINT_INDEX, id },
    { signal: abortSignal }
  );
  return toStored({
    _id: response._id,
    _seq_no: response._seq_no,
    _primary_term: response._primary_term,
    _source: response._source as Record<string, unknown> | undefined,
  });
};

/**
 * Moves the chain window forward to the latest phase so a later continuation can
 * still find this fingerprint. A conflicting update is re-read and merged again, so
 * one extension cannot erase another. A failed update still attaches the attack.
 */
const extendFingerprint = async (
  esClient: ElasticsearchClient,
  stored: StoredFingerprint,
  group: readonly AttackSignals[],
  now: Date,
  abortSignal: AbortSignal | undefined,
  logger: StepHandlerContext['logger']
): Promise<void> => {
  const span = chainSpan(group);
  let current = stored;
  for (let attempt = 0; attempt < EXTEND_ATTEMPTS; attempt++) {
    try {
      await esClient.update(
        {
          index: ATTACK_FINGERPRINT_INDEX,
          id: current.id,
          ...(current.seqNo !== undefined && current.primaryTerm !== undefined
            ? { if_seq_no: current.seqNo, if_primary_term: current.primaryTerm }
            : {}),
          doc: extensionDoc(current, span, now),
        },
        { signal: abortSignal }
      );
      return;
    } catch (error) {
      const canRetry = isConflict(error) && attempt < EXTEND_ATTEMPTS - 1;
      if (!canRetry) {
        logger.warn(
          `Attack fingerprint extend failed for ${stored.investigationId}: ${errorText(error)}`
        );
        return;
      }
      const reread = await readStoredFingerprint(esClient, current.id, abortSignal).catch(
        () => undefined
      );
      if (reread === undefined) {
        logger.warn(
          `Attack fingerprint extend failed for ${stored.investigationId}: ${errorText(error)}`
        );
        return;
      }
      current = reread;
    }
  }
};

const readInvestigation = async (
  contextManager: StepHandlerContext['contextManager'],
  investigationId: string,
  logger: StepHandlerContext['logger']
): Promise<InvestigationMeta | undefined> => {
  try {
    const { body } = await contextManager.callKibanaApi<{
      metadata?: { status?: string; close_reason?: string; verdict?: string };
    }>({
      method: 'GET',
      path: `/api/agent_builder/conversations/${encodeURIComponent(investigationId)}`,
      headers: { 'elastic-api-version': '2023-10-31' },
    });
    return {
      status: body.metadata?.status,
      closeReason: body.metadata?.close_reason,
      verdict: body.metadata?.verdict,
    };
  } catch (error) {
    if (error instanceof KibanaApiCallError && error.status === 404) {
      return undefined;
    }
    logger.warn(
      `Attack fingerprint could not read Investigation ${investigationId}: ${errorText(error)}`
    );
    return undefined;
  }
};

const reviewOf = (
  attack: AttackSignals,
  relatedInvestigationId: string,
  siblingIds: readonly string[],
  siblingDiscoveryIds: readonly string[]
): MatchReview => ({
  attack_discovery_id: attack.attackId.slice(0, 512),
  title: attack.title.slice(0, 1024),
  alert_ids: attack.alertIds.slice(0, MAX_ALERT_IDS),
  summary_markdown: attack.summaryMarkdown.slice(0, 8000),
  related_investigation_id: relatedInvestigationId.slice(0, 256),
  sibling_alert_ids: siblingIds.slice(0, MAX_ALERT_IDS),
  sibling_attack_discovery_ids: siblingDiscoveryIds.slice(0, MAX_ALERT_IDS),
});

/** Every parsed attack as its own review. Used when matching itself fails. */
export const reviewsWhenMatchFails = (
  attacks: readonly Record<string, unknown>[]
): MatchAttackFingerprintsOutput => ({
  reviews: attacks
    .map((raw) => parseAttack(raw))
    .filter((item): item is AttackSignals => item !== undefined)
    .map((attack) => reviewOf(attack, '', [], [])),
  attachments: [],
});

// Alert ids the later attacks add. The review tags these with its own when the
// verdict escalates, and the combined list stays within one tag write.
const siblingAlertIds = (group: readonly AttackSignals[]): string[] => {
  const seen = new Set(group[0]?.alertIds.slice(0, MAX_ALERT_IDS) ?? []);
  const ids: string[] = [];
  const limit = MAX_ALERT_IDS - seen.size;
  for (const member of group.slice(1)) {
    for (const alertId of member.alertIds) {
      if (!seen.has(alertId)) {
        if (ids.length >= limit) {
          return ids;
        }
        seen.add(alertId);
        ids.push(alertId);
      }
    }
  }
  return ids;
};

const siblingDiscoveryIds = (group: readonly AttackSignals[]): string[] =>
  group.slice(1, MAX_ALERT_IDS + 1).map((member) => member.attackId.slice(0, 512));

const privilegesMappingType = (
  mapping: Record<string, unknown> | undefined
): string | undefined => {
  const properties = mapping?.properties as Record<string, unknown> | undefined;
  const permissions = properties?.permissions as
    | { properties?: Record<string, unknown> }
    | undefined;
  const kibana = permissions?.properties?.kibana as
    | { properties?: Record<string, unknown> }
    | undefined;
  const privileges = kibana?.properties?.privileges as { type?: string } | undefined;
  return privileges?.type;
};

/**
 * The worker cannot create this index or read index templates. A missing index is safe to
 * auto-create only after AlertZero has installed the nested template. An existing index whose
 * privilege field is not nested cannot be repaired, and another write would keep leaking it.
 */
const assertFingerprintWritesAllowed = async (
  esClient: ElasticsearchClient,
  abortSignal: AbortSignal | undefined,
  logger: StepHandlerContext['logger']
): Promise<void> => {
  try {
    const exists = await esClient.indices.exists(
      { index: ATTACK_FINGERPRINT_INDEX },
      { signal: abortSignal }
    );
    if (exists !== true) {
      if (!fingerprintCreateAllowed) {
        throw new FingerprintIndexUnscopedError();
      }
      return;
    }

    const response = await esClient.indices.getMapping(
      { index: ATTACK_FINGERPRINT_INDEX },
      { signal: abortSignal }
    );
    const current = Object.values(response)[0]?.mappings as Record<string, unknown> | undefined;
    if (privilegesMappingType(current) !== 'nested') {
      throw new FingerprintIndexUnscopedError();
    }
  } catch (error) {
    if (error instanceof FingerprintIndexUnscopedError) {
      logger.warn(
        'Attack fingerprint index is not space-scoped; reviewing every attack and writing no fingerprint'
      );
      throw error;
    }
    logger.warn(
      `Attack fingerprint index mapping was not read; reviewing every attack and writing no fingerprint: ${errorText(
        error
      )}`
    );
    throw new FingerprintIndexUnscopedError();
  }
};

const attachmentOf = (
  attack: AttackSignals,
  investigationId: string,
  tag: boolean,
  retireAlerts: boolean
): MatchAttachment => ({
  attack_discovery_id: attack.attackId.slice(0, 512),
  title: attack.title.slice(0, 1024),
  alert_ids: attack.alertIds.slice(0, MAX_ALERT_IDS),
  summary_markdown: attack.summaryMarkdown.slice(0, 8000),
  investigation_id: investigationId.slice(0, 256),
  journal_alerts_retired: retireAlerts,
  tag_correlated_alerts: tag,
});

const applyDecision = (
  group: readonly AttackSignals[],
  decision: Disposition,
  reviews: MatchReview[],
  attachments: MatchAttachment[]
): void => {
  if (decision.kind === 'attach') {
    for (const member of group) {
      attachments.push(
        attachmentOf(
          member,
          decision.investigationId,
          decision.tagCorrelatedAlerts,
          decision.journalAlertsRetired
        )
      );
    }
    return;
  }

  // The review tags the later attacks' alerts with its own when the verdict
  // escalates. A false positive leaves the whole batch untagged.
  reviews.push(
    reviewOf(
      group[0],
      decision.relatedInvestigationId,
      siblingAlertIds(group),
      siblingDiscoveryIds(group)
    )
  );
  for (const member of group.slice(1)) {
    attachments.push(attachmentOf(member, decision.investigationId, false, false));
  }
};

/**
 * Clusters one worker run in memory, matches each group to an unexpired fingerprint,
 * and writes a fingerprint only for a canonical attack that opens a new Investigation.
 */
export const matchAttackFingerprints = async ({
  abortSignal,
  attacks,
  contextManager,
  esClient,
  logger,
  now = new Date(),
  parentRunId,
  spaceId,
}: {
  abortSignal?: AbortSignal;
  attacks: readonly Record<string, unknown>[];
  contextManager: StepHandlerContext['contextManager'];
  esClient: ElasticsearchClient;
  logger: StepHandlerContext['logger'];
  now?: Date;
  parentRunId?: string;
  spaceId: string;
}): Promise<MatchAttackFingerprintsOutput> => {
  const parsed = attacks
    .map((raw) => parseAttack(raw))
    .filter((item): item is AttackSignals => item !== undefined);
  if (parsed.length === 0) {
    return { reviews: [], attachments: [] };
  }

  await assertFingerprintWritesAllowed(esClient, abortSignal, logger);

  const enriched = await mapPool(parsed, ENRICH_CONCURRENCY, (attack) =>
    enrichAttack(attack, esClient, spaceId, abortSignal, logger)
  );
  const groups = clusterNewAttacks(enriched);
  const stored = await searchFingerprints(
    esClient,
    spaceId,
    enriched,
    now.toISOString(),
    abortSignal,
    logger
  );

  const investigationIds = uniqueSorted(
    groups
      .map((group) => bestStoredForGroup(group, stored)?.investigationId)
      .filter((id): id is string => id !== undefined)
  );
  const investigations = new Map<string, InvestigationMeta | undefined>();
  await mapPool(investigationIds, ENRICH_CONCURRENCY, async (id) => {
    investigations.set(id, await readInvestigation(contextManager, id, logger));
  });

  const reviews: MatchReview[] = [];
  const attachments: MatchAttachment[] = [];
  for (const group of groups) {
    const span = chainSpan(group);
    const match = bestStoredForGroup(group, stored);
    let decision = disposition(
      span,
      match,
      match === undefined ? undefined : investigations.get(match.investigationId),
      group,
      now
    );

    if (decision.kind === 'attach' && match !== undefined) {
      await extendFingerprint(esClient, match, group, now, abortSignal, logger);
    } else {
      const written = await createFingerprint(
        esClient,
        group,
        spaceId,
        decision.investigationId,
        parentRunId,
        now,
        abortSignal,
        logger
      );
      const canonical = group[0];
      if (written.conflict && canonical !== undefined) {
        const conflicting = await readStoredFingerprint(
          esClient,
          fingerprintId(spaceId, canonical),
          abortSignal
        ).catch(() => undefined);
        const meta =
          conflicting === undefined
            ? undefined
            : await readInvestigation(contextManager, conflicting.investigationId, logger);
        if (canAdoptConflict(decision, conflicting, meta, group, now)) {
          decision = {
            kind: 'attach',
            investigationId: conflicting.investigationId,
            relatedInvestigationId: '',
            journalAlertsRetired: journalAlertsRetired(meta),
            tagCorrelatedAlerts: tagCorrelatedAlerts(meta),
          };
          await extendFingerprint(esClient, conflicting, group, now, abortSignal, logger);
        } else {
          await createFingerprint(
            esClient,
            group,
            spaceId,
            decision.investigationId,
            parentRunId,
            now,
            abortSignal,
            logger,
            decision.investigationId
          );
        }
      }
    }

    applyDecision(group, decision, reviews, attachments);
  }

  return { reviews, attachments };
};
