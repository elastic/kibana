/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { StreamsKnowledgeIndicatorsReader } from '@kbn/streams-plugin/server';
import { getLatestEntitiesIndexName } from '../../../common';
import type { ResolutionClient } from '../../domain/resolution';
import { getFieldValue } from '../../../common/domain/euid/commons';
import { ENTITY_ID_FIELD } from '../../../common/domain/definitions/common_fields';
import { ENTITY_CONFIDENCE } from '../../../common/domain/definitions/user_entity_constants';
import {
  loadEntityResolutionClues,
  loadIdentityLinkRules,
  extractIdentityLinkClues,
} from '../../domain/streams_features';
import type { IdentityLinkClue } from '../../domain/streams_features';
import type { MaintainerTelemetryClient } from '../../tasks/entity_maintainers/maintainer_telemetry_client';
import { NAMESPACE_PRIORITY, selectTarget } from '../automated_resolution/run';
import type { EntityHit } from '../automated_resolution/types';
import type { EntityConfidence } from '../../../common/domain/definitions/user_entity_constants';
import type { KiAutomatedResolutionState } from './types';

const ENGINE_METADATA_TYPE_FIELD = 'entity.EngineMetadata.Type';
const RESOLVED_TO_FIELD = 'entity.relationships.resolution.resolved_to';
const ENTITY_NAMESPACE_FIELD = 'entity.namespace';
const ENTITY_CONFIDENCE_FIELD = 'entity.confidence';
const USER_NAME_FIELD = 'user.name';
const USER_EMAIL_FIELD = 'user.email';
const ENTITY_TYPE = 'user';
const SEARCH_SIZE = 100;

export interface RunDeps {
  state: KiAutomatedResolutionState;
  namespace: string;
  esClient: ElasticsearchClient;
  logger: Logger;
  resolutionClient: ResolutionClient;
  reader: StreamsKnowledgeIndicatorsReader;
  minConfidence: number;
  /**
   * When true, also resolves high-confidence IdP entities in a lower-priority
   * namespace (e.g. GitHub) to a higher-priority IdP target (Okta / AD) for the
   * same person. When false, only medium -> high resolution runs.
   */
  resolveIdpToIdp: boolean;
  /**
   * When true, also loads `identity_link_rule` Knowledge Indicators and executes
   * them deterministically over their streams (one ES|QL aggregation per stream)
   * to materialize a clue for EVERY user — not just the LLM-sampled ones. Merged
   * with the per-user `identity_link` clues before resolution. When false, only
   * the per-user clues are used.
   */
  useRules: boolean;
  telemetry?: MaintainerTelemetryClient;
  abortController: AbortController;
}

const emptyLastRun: NonNullable<KiAutomatedResolutionState['lastRun']> = {
  cluesLoaded: 0,
  rulesLoaded: 0,
  deterministicCluesExtracted: 0,
  resolutionsCreated: 0,
  idpResolutionsCreated: 0,
  skippedAmbiguous: 0,
  skippedNoTarget: 0,
  skippedNoCandidate: 0,
  skippedWrongDirection: 0,
  failed: 0,
};

/**
 * Priority rank for a namespace: lower number = higher priority. Reuses the
 * email resolver's `NAMESPACE_PRIORITY` so target selection and the IdP -> IdP
 * directionality guard agree. Namespaces outside the list rank lowest
 * (`Infinity`), so a non-priority integration (e.g. GitHub) always resolves
 * toward a known IdP rather than the other way around.
 */
const namespacePriorityRank = (namespace: string): number => {
  const index = NAMESPACE_PRIORITY.indexOf(namespace);
  return index === -1 ? Infinity : index;
};

/**
 * KI-driven entity resolution (POC).
 *
 * Reads `type: 'entity'` Knowledge Indicators that carry a deterministic
 * `identity_link` clue (`user_name` → `user_email`), then for each unambiguous
 * username:
 *  1. finds the high-confidence IdP user entity matching the linked email
 *     (the target / golden entity, chosen by namespace priority);
 *  2. finds the medium-confidence `local` user entities matching that username
 *     (the candidates the existing email resolver cannot link — they lack a
 *     clean `user.email`);
 *  3. when `resolveIdpToIdp` is on, ALSO finds high-confidence IdP entities
 *     matching that username whose namespace ranks strictly lower than the
 *     target's (e.g. GitHub → Okta/AD), guarding direction so a higher-priority
 *     IdP is never demoted and same-namespace pairs are skipped;
 *  4. links the candidates to the target via the existing `ResolutionClient`,
 *     writing only `entity.relationships.resolution.resolved_to`.
 *
 * Idempotent: re-evaluates all clues each run; `linkEntities` skips entities
 * already resolved to the target, so there is no watermark to advance.
 */
export async function runKiAutomatedResolution(deps: RunDeps): Promise<KiAutomatedResolutionState> {
  const {
    namespace,
    esClient,
    logger,
    resolutionClient,
    reader,
    minConfidence,
    resolveIdpToIdp,
    useRules,
    telemetry,
    abortController,
  } = deps;
  const index = getLatestEntitiesIndexName(namespace);

  const perUserClues = await loadEntityResolutionClues(reader, { minConfidence }, logger);

  // Deterministic path: load identity-link rules and execute them over their
  // streams to materialize a clue for every user, closing the LLM-sampling gap.
  let rulesLoaded = 0;
  let deterministicClues: IdentityLinkClue[] = [];
  if (useRules) {
    const rules = await loadIdentityLinkRules(reader, { minConfidence }, logger);
    rulesLoaded = rules.length;
    deterministicClues = await extractIdentityLinkClues({
      esClient,
      reader,
      rules,
      logger,
      abortController,
    });
  }
  const deterministicCluesExtracted = deterministicClues.length;

  // Both sources feed the same resolution logic; ambiguity/dedup is handled
  // below via the per-username email set, so overlapping pairs are harmless.
  const clues = [...perUserClues, ...deterministicClues];
  if (clues.length === 0) {
    logger.debug('KI entity resolution: no identity-link clues found, nothing to resolve');
    telemetry?.report({ funnel: { scanned: 0, qualified: 0, applied: 0, skipped: 0, failed: 0 } });
    return { lastRun: { ...emptyLastRun, rulesLoaded, deterministicCluesExtracted } };
  }

  // Group clues by username and detect ambiguity (one token → several emails).
  const emailsByUserName = new Map<string, Set<string>>();
  for (const clue of clues) {
    const set = emailsByUserName.get(clue.userName) ?? new Set<string>();
    set.add(clue.userEmail);
    emailsByUserName.set(clue.userName, set);
  }

  let resolutionsCreated = 0;
  let idpResolutionsCreated = 0;
  let skippedAmbiguous = 0;
  let skippedNoTarget = 0;
  let skippedNoCandidate = 0;
  let skippedWrongDirection = 0;
  let failed = 0;

  for (const [userName, emails] of emailsByUserName) {
    if (abortController.signal.aborted) {
      logger.debug('KI entity resolution: aborted mid-run');
      break;
    }

    if (emails.size !== 1) {
      logger.warn(
        `KI entity resolution: skipping ambiguous username '${userName}' (mapped to ${emails.size} distinct emails)`
      );
      skippedAmbiguous++;
      continue;
    }

    const userEmail = [...emails][0];

    try {
      const targets = await findHighTargets(esClient, index, userEmail);
      if (targets.length === 0) {
        skippedNoTarget++;
        continue;
      }

      const target = targets.length === 1 ? targets[0] : selectTarget(targets);
      const targetRank = namespacePriorityRank(target.namespace);

      const mediumCandidates = await findCandidatesByUserName(
        esClient,
        index,
        userName,
        ENTITY_CONFIDENCE.Medium
      );

      // IdP -> IdP: high-confidence entities matching the username whose
      // namespace ranks strictly lower than the target's. Equal/higher rank
      // (same namespace, or a higher-priority IdP) is the wrong direction.
      const idpCandidates: EntityHit[] = [];
      if (resolveIdpToIdp) {
        const highMatches = await findCandidatesByUserName(
          esClient,
          index,
          userName,
          ENTITY_CONFIDENCE.High
        );
        for (const candidate of highMatches) {
          if (candidate.entityId === target.entityId) {
            continue;
          }
          if (namespacePriorityRank(candidate.namespace) > targetRank) {
            idpCandidates.push(candidate);
          } else {
            skippedWrongDirection++;
          }
        }
      }

      const aliasIds = [...mediumCandidates, ...idpCandidates]
        .map((candidate) => candidate.entityId)
        .filter((entityId) => entityId !== target.entityId);

      if (aliasIds.length === 0) {
        skippedNoCandidate++;
        continue;
      }

      const idpAliasIds = new Set(idpCandidates.map((candidate) => candidate.entityId));
      const result = await resolutionClient.linkEntities(target.entityId, aliasIds);
      resolutionsCreated += result.linked.length;
      idpResolutionsCreated += result.linked.filter((entityId) => idpAliasIds.has(entityId)).length;
      logger.debug(
        `KI entity resolution: linked ${result.linked.length} candidate(s) for '${userName}' → '${target.entityId}'`
      );
    } catch (err) {
      failed++;
      logger.warn(
        `KI entity resolution: failed to resolve username '${userName}': ${err?.message ?? err}`
      );
    }
  }

  logger.info(
    `KI entity resolution: ${resolutionsCreated} resolution(s) created (${idpResolutionsCreated} IdP→IdP), ` +
      `${skippedAmbiguous} ambiguous, ${skippedNoTarget} without target, ` +
      `${skippedNoCandidate} without candidate, ${skippedWrongDirection} wrong-direction, ${failed} failed`
  );

  telemetry?.report({
    funnel: {
      scanned: clues.length,
      qualified: emailsByUserName.size,
      applied: resolutionsCreated,
      skipped: skippedAmbiguous + skippedNoTarget + skippedNoCandidate + skippedWrongDirection,
      failed,
    },
  });

  return {
    lastRun: {
      cluesLoaded: clues.length,
      rulesLoaded,
      deterministicCluesExtracted,
      resolutionsCreated,
      idpResolutionsCreated,
      skippedAmbiguous,
      skippedNoTarget,
      skippedNoCandidate,
      skippedWrongDirection,
      failed,
    },
  };
}

const toEntityHit = (hit: SearchHit): EntityHit => ({
  entityId: getFieldValue(hit._source as Record<string, unknown>, ENTITY_ID_FIELD) ?? '',
  namespace: getFieldValue(hit._source as Record<string, unknown>, ENTITY_NAMESPACE_FIELD) ?? '',
});

/**
 * User entities at the given confidence whose `user.name` matches the clue
 * (case-insensitive) and that are not already aliases.
 *
 * - `medium` → the EDR/Windows/Linux `user@host@local` rows the email resolver
 *   cannot link.
 * - `high` → IdP/integration entities (e.g. GitHub login) used as IdP -> IdP
 *   candidates; the caller still applies the namespace-priority direction guard.
 */
async function findCandidatesByUserName(
  esClient: ElasticsearchClient,
  index: string,
  userName: string,
  confidence: EntityConfidence
): Promise<EntityHit[]> {
  const response = await esClient.search({
    index,
    size: SEARCH_SIZE,
    _source: [ENTITY_ID_FIELD, ENTITY_NAMESPACE_FIELD],
    query: {
      bool: {
        filter: [
          { term: { [ENGINE_METADATA_TYPE_FIELD]: ENTITY_TYPE } },
          { term: { [ENTITY_CONFIDENCE_FIELD]: confidence } },
          { term: { [USER_NAME_FIELD]: { value: userName, case_insensitive: true } } },
        ],
        must_not: [{ exists: { field: RESOLVED_TO_FIELD } }],
      },
    },
  });

  return response.hits.hits.map(toEntityHit).filter((hit) => hit.entityId !== '');
}

/**
 * High-confidence (`entity.confidence: high`) IdP user entities whose
 * `user.email` matches the clue (case-insensitive) and that are not already
 * aliases. These are the directory-backed golden entities to resolve toward.
 */
async function findHighTargets(
  esClient: ElasticsearchClient,
  index: string,
  userEmail: string
): Promise<EntityHit[]> {
  const response = await esClient.search({
    index,
    size: SEARCH_SIZE,
    _source: [ENTITY_ID_FIELD, ENTITY_NAMESPACE_FIELD],
    query: {
      bool: {
        filter: [
          { term: { [ENGINE_METADATA_TYPE_FIELD]: ENTITY_TYPE } },
          { term: { [ENTITY_CONFIDENCE_FIELD]: ENTITY_CONFIDENCE.High } },
          { term: { [USER_EMAIL_FIELD]: { value: userEmail, case_insensitive: true } } },
        ],
        must_not: [{ exists: { field: RESOLVED_TO_FIELD } }],
      },
    },
  });

  return response.hits.hits.map(toEntityHit).filter((hit) => hit.entityId !== '');
}
