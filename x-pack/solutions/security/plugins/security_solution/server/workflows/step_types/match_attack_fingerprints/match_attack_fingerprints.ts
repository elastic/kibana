/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
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
import {
  FINGERPRINT_TTL_MS,
  STORED_ALERT_ID_CAP,
  bestStoredForGroup,
  chainSpan,
  clusterNewAttacks,
  disposition,
  fingerprintId,
  journalAlertsRetired,
  tagCorrelatedAlerts,
  uniqueSorted,
} from './cluster';

export const ATTACK_FINGERPRINT_AI_INDEX_ID = 'security-attack-fingerprints';
export const ATTACK_FINGERPRINT_INDEX = `ai-index-idx-${ATTACK_FINGERPRINT_AI_INDEX_ID}`;
export const ATTACK_FINGERPRINT_TYPE = 'security.attack_fingerprint';
export const ATTACK_FINGERPRINT_TAG = 'consumer:attack-discovery';

const SEARCH_SIZE = 100;
const ENRICH_CONCURRENCY = 4;
const TERMS_CAP = 100;
const CONTENT_MAX = 4000;

export interface MatchReview {
  attack_discovery_id: string;
  title: string;
  alert_ids: string[];
  summary_markdown: string;
  related_investigation_id: string;
}

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

const isInferenceError = (error: unknown): boolean => /inference/i.test(errorText(error));

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
  const [entities, span] = await Promise.all([
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
      return {};
    }),
  ]);

  return {
    ...attack,
    hostEntityIds: entities.entities
      .filter((entity) => entity.type === 'host')
      .map((entity) => entity.id),
    userEntityIds: entities.entities
      .filter((entity) => entity.type === 'user')
      .map((entity) => entity.id),
    firstAlertAt: span.first,
    lastAlertAt: span.last,
  };
};

const toStored = (hit: {
  _id?: string;
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
    tactics: asStringList(attributes.mitre_attack_tactics),
    firstAlertAt:
      typeof attributes.first_alert_at === 'string' ? attributes.first_alert_at : undefined,
    lastAlertAt:
      typeof attributes.last_alert_at === 'string' ? attributes.last_alert_at : undefined,
    expiresAt: typeof source.expires_at === 'string' ? source.expires_at : undefined,
  };
};

const attributeQuery = (spaceId: string, attacks: readonly AttackSignals[], now: string) => {
  const hosts = uniqueSorted(attacks.flatMap((item) => item.hostEntityIds)).slice(0, TERMS_CAP);
  const users = uniqueSorted(attacks.flatMap((item) => item.userEntityIds)).slice(0, TERMS_CAP);
  const alertIds = uniqueSorted(attacks.flatMap((item) => item.alertIds)).slice(0, TERMS_CAP);
  const should = [
    ...(hosts.length > 0 ? [{ terms: { 'attributes.host_entity_ids': hosts } }] : []),
    ...(users.length > 0 ? [{ terms: { 'attributes.user_entity_ids': users } }] : []),
    ...(alertIds.length > 0 ? [{ terms: { 'attributes.alert_ids': alertIds } }] : []),
  ];
  return {
    bool: {
      filter: [
        { term: { type: ATTACK_FINGERPRINT_TYPE } },
        { term: { 'attributes.space_id': spaceId } },
        { range: { expires_at: { gt: now } } },
      ],
      ...(should.length > 0 ? { should, minimum_should_match: 1 } : {}),
    },
  };
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

  try {
    const response = await esClient.search(
      {
        index: ATTACK_FINGERPRINT_INDEX,
        ignore_unavailable: true,
        size: SEARCH_SIZE,
        sort: [{ expires_at: { order: 'desc' } }],
        query: attributeQuery(spaceId, attacks, now),
      },
      { signal: abortSignal }
    );
    const stored = (response.hits?.hits ?? [])
      .map((hit) => toStored(hit as { _id?: string; _source?: Record<string, unknown> }))
      .filter((item): item is StoredFingerprint => item !== undefined);
    if (stored.length > 0) {
      return stored;
    }
  } catch (error) {
    if (!isNotFoundError(error)) {
      logger.warn(`Attack fingerprint search failed: ${errorText(error)}`);
    }
    return [];
  }

  // Attribute terms are the match. Semantic retrieval only runs when they found
  // nothing, and a failure here leaves the run on alert and entity comparison alone.
  try {
    const response = await esClient.search(
      {
        index: ATTACK_FINGERPRINT_INDEX,
        ignore_unavailable: true,
        timeout: '2s',
        size: SEARCH_SIZE,
        query: {
          bool: {
            filter: [
              { term: { type: ATTACK_FINGERPRINT_TYPE } },
              { term: { 'attributes.space_id': spaceId } },
              { range: { expires_at: { gt: now } } },
            ],
            should: attacks.slice(0, 5).map((attack) => ({
              semantic: { field: 'content.semantic', query: signatureOf(attack).slice(0, 500) },
            })),
            minimum_should_match: 1,
          },
        } as QueryDslQueryContainer,
      },
      { signal: abortSignal }
    );
    return (response.hits?.hits ?? [])
      .map((hit) => toStored(hit as { _id?: string; _source?: Record<string, unknown> }))
      .filter((item): item is StoredFingerprint => item !== undefined);
  } catch (error) {
    logger.warn(`Attack fingerprint semantic search failed: ${errorText(error)}`);
    return [];
  }
};

const signatureOf = (attack: AttackSignals): string => {
  const line = `host:${uniqueSorted(attack.hostEntityIds).join(' ')} user:${uniqueSorted(
    attack.userEntityIds
  ).join(' ')} tactic:${uniqueSorted(attack.tactics).join(' ')} alerts:${
    attack.firstAlertAt ?? ''
  }/${attack.lastAlertAt ?? ''}`;
  return `${line}\n${attack.summaryMarkdown}`.slice(0, CONTENT_MAX);
};

const fingerprintDocument = (
  attack: AttackSignals,
  documentId: string,
  spaceId: string,
  investigationId: string,
  parentRunId: string | undefined,
  now: Date,
  includeContent: boolean
) => {
  const last = attack.lastAlertAt === undefined ? Number.NaN : Date.parse(attack.lastAlertAt);
  const expiresAt = new Date(
    (Number.isNaN(last) ? now.getTime() : last) + FINGERPRINT_TTL_MS
  ).toISOString();
  return {
    '@timestamp': now.toISOString(),
    id: documentId,
    type: ATTACK_FINGERPRINT_TYPE,
    title: attack.title.slice(0, 512),
    tags: [ATTACK_FINGERPRINT_TAG],
    expires_at: expiresAt,
    ...(includeContent ? { content: signatureOf(attack) } : {}),
    attributes: {
      space_id: spaceId,
      investigation_id: investigationId,
      attack_discovery_id: attack.attackId,
      alert_ids: uniqueSorted(attack.alertIds).slice(0, STORED_ALERT_ID_CAP),
      alert_count: attack.alertIds.length,
      host_entity_ids: uniqueSorted(attack.hostEntityIds).slice(0, STORED_ALERT_ID_CAP),
      user_entity_ids: uniqueSorted(attack.userEntityIds).slice(0, STORED_ALERT_ID_CAP),
      mitre_attack_tactics: uniqueSorted(attack.tactics).slice(0, STORED_ALERT_ID_CAP),
      first_alert_at: attack.firstAlertAt ?? '',
      last_alert_at: attack.lastAlertAt ?? '',
      status: 'open',
      parent_run_id: parentRunId ?? '',
    },
  };
};

const readStoredInvestigationId = async (
  esClient: ElasticsearchClient,
  id: string,
  abortSignal: AbortSignal | undefined
): Promise<string | undefined> => {
  const response = await esClient.get(
    { index: ATTACK_FINGERPRINT_INDEX, id },
    { signal: abortSignal }
  );
  const source = response._source as Record<string, unknown> | undefined;
  const attributes = (source?.attributes ?? {}) as Record<string, unknown>;
  return typeof attributes.investigation_id === 'string' ? attributes.investigation_id : undefined;
};

/**
 * Writes the canonical fingerprint with `op_type: create`. A 409 means another run won
 * the same entity key; the caller attaches to that document's Investigation.
 * An inference failure is retried without `content` so the attributes still persist.
 */
const createFingerprint = async (
  esClient: ElasticsearchClient,
  group: readonly AttackSignals[],
  spaceId: string,
  investigationId: string,
  parentRunId: string | undefined,
  now: Date,
  abortSignal: AbortSignal | undefined,
  logger: StepHandlerContext['logger']
): Promise<{ conflictInvestigationId?: string }> => {
  const canonical = group[0];
  const span = chainSpan(group);
  const id = fingerprintId(spaceId, canonical);
  const write = (includeContent: boolean) =>
    esClient.index(
      {
        index: ATTACK_FINGERPRINT_INDEX,
        id,
        op_type: 'create',
        document: fingerprintDocument(
          span,
          id,
          spaceId,
          investigationId,
          parentRunId,
          now,
          includeContent
        ),
      },
      { signal: abortSignal }
    );

  try {
    await write(true);
    return {};
  } catch (error) {
    if (isConflict(error)) {
      const conflictInvestigationId = await readStoredInvestigationId(
        esClient,
        id,
        abortSignal
      ).catch(() => undefined);
      return { conflictInvestigationId };
    }
    if (!isInferenceError(error)) {
      logger.warn(`Attack fingerprint write failed for ${canonical.attackId}: ${errorText(error)}`);
      return {};
    }
  }

  try {
    await write(false);
    return {};
  } catch (error) {
    if (isConflict(error)) {
      const conflictInvestigationId = await readStoredInvestigationId(
        esClient,
        id,
        abortSignal
      ).catch(() => undefined);
      return { conflictInvestigationId };
    }
    logger.warn(
      `Attack fingerprint attribute write failed for ${canonical.attackId}: ${errorText(error)}`
    );
    return {};
  }
};

/**
 * Moves the chain window forward to the latest phase so a later continuation can
 * still find this fingerprint. A failed update still attaches the attack.
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
  const lastMs = span.lastAlertAt === undefined ? Number.NaN : Date.parse(span.lastAlertAt);
  const expiresAt = new Date(
    (Number.isNaN(lastMs) ? now.getTime() : lastMs) + FINGERPRINT_TTL_MS
  ).toISOString();
  const nextExpires =
    stored.expiresAt !== undefined && stored.expiresAt > expiresAt ? stored.expiresAt : expiresAt;
  const firstAlertAt = [stored.firstAlertAt, span.firstAlertAt]
    .filter((value): value is string => value !== undefined && value.length > 0)
    .sort()[0];
  const lastAlertAt = [stored.lastAlertAt, span.lastAlertAt]
    .filter((value): value is string => value !== undefined && value.length > 0)
    .sort()
    .at(-1);
  const alertIds = uniqueSorted([...stored.alertIds, ...span.alertIds]);

  try {
    await esClient.update(
      {
        index: ATTACK_FINGERPRINT_INDEX,
        id: stored.id,
        doc: {
          expires_at: nextExpires,
          attributes: {
            alert_ids: alertIds.slice(0, STORED_ALERT_ID_CAP),
            alert_count: alertIds.length,
            host_entity_ids: uniqueSorted([...stored.hostEntityIds, ...span.hostEntityIds]).slice(
              0,
              STORED_ALERT_ID_CAP
            ),
            user_entity_ids: uniqueSorted([...stored.userEntityIds, ...span.userEntityIds]).slice(
              0,
              STORED_ALERT_ID_CAP
            ),
            mitre_attack_tactics: uniqueSorted([...stored.tactics, ...span.tactics]).slice(
              0,
              STORED_ALERT_ID_CAP
            ),
            first_alert_at: firstAlertAt ?? '',
            last_alert_at: lastAlertAt ?? '',
          },
        },
      },
      { signal: abortSignal }
    );
  } catch (error) {
    logger.warn(
      `Attack fingerprint extend failed for ${stored.investigationId}: ${errorText(error)}`
    );
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

const reviewOf = (attack: AttackSignals, relatedInvestigationId: string): MatchReview => ({
  attack_discovery_id: attack.attackId.slice(0, 512),
  title: attack.title.slice(0, 1024),
  alert_ids: attack.alertIds.slice(0, MAX_ALERT_IDS),
  summary_markdown: attack.summaryMarkdown.slice(0, 8000),
  related_investigation_id: relatedInvestigationId.slice(0, 256),
});

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

  reviews.push(reviewOf(group[0], decision.relatedInvestigationId));
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
      match === undefined ? undefined : investigations.get(match.investigationId)
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
      if (written.conflictInvestigationId !== undefined) {
        const meta = await readInvestigation(
          contextManager,
          written.conflictInvestigationId,
          logger
        );
        decision = {
          kind: 'attach',
          investigationId: written.conflictInvestigationId,
          relatedInvestigationId: '',
          journalAlertsRetired: journalAlertsRetired(meta),
          tagCorrelatedAlerts: tagCorrelatedAlerts(meta),
        };
      }
    }

    applyDecision(group, decision, reviews, attachments);
  }

  return { reviews, attachments };
};
