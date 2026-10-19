/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { QueryLink } from '@kbn/significant-events-schema';
import type { StrategyCandidate } from '../../../common';
import { getErrorMessage } from '../errors';
import { activeThresholds, listCandidates, runningDetectors } from '../learning/candidates';
import type { RunningDetector } from '../strategies/types';
import type { Dependency } from '../pipeline/join_proposals';
import type { IEngineScope } from './engine_scope';

/** KI dependencies below this confidence count only when the data shows them too. */
const MIN_KI_DEPENDENCY_CONFIDENCE = 70;

/** What the engine reads from knowledge in one run. */
export interface IRunKnowledge {
  /** Match queries of the enabled sources, promoted or not. Read once, on first use. */
  getQueryLinks(): Promise<QueryLink[]>;
  /** Service dependencies, for join proposals and related services. Never throws. */
  getDependencies(): Promise<Dependency[]>;
  /** Detectors the learning loop wrote that are in trial or live, on enabled sources. */
  getLearnedDetectors(): Promise<RunningDetector[]>;
  /** Learned per-series `mad_k` values in force. */
  getThresholds(): Promise<Map<string, number>>;
}

export function createRunKnowledge({
  scope,
  sources,
}: {
  scope: IEngineScope;
  sources: NightshiftSource[];
}): IRunKnowledge {
  const sourceIds = sources.map((source) => source.id);
  let links: Promise<QueryLink[]> | undefined;
  let dependencies: Promise<Dependency[]> | undefined;
  let candidates: Promise<StrategyCandidate[]> | undefined;
  const getCandidates = () => {
    candidates ??= listCandidates(scope.storage.state).catch((error) => {
      // Without its learned changes the engine still runs what people configured.
      scope.logger.warn(`Could not read learned changes: ${getErrorMessage(error)}`);
      return [];
    });
    return candidates;
  };

  return {
    getQueryLinks() {
      links ??=
        sourceIds.length === 0
          ? Promise.resolve([])
          : scope
              .getKnowledgeIndicatorClient()
              .then((client) =>
                client.getQueryLinks(sourceIds, { queryTypes: ['match'], ruleUnbacked: 'include' })
              );
      return links;
    },

    async getLearnedDetectors() {
      const enabled = new Set(sourceIds);
      return runningDetectors(await getCandidates()).filter((detector) =>
        enabled.has(detector.source_id)
      );
    },

    async getThresholds() {
      return activeThresholds(await getCandidates());
    },

    getDependencies() {
      dependencies ??=
        sourceIds.length === 0
          ? Promise.resolve([])
          : scope
              .getKnowledgeIndicatorClient()
              .then((client) => client.getFeatures(sourceIds, { type: ['dependency'] }))
              .then(async ({ hits }) => {
                const observed = (await scope.storage.state.get('topology'))?.edges ?? [];
                const seen = new Set(observed.map((edge) => `${edge.source}->${edge.target}`));
                const fromKis = hits.flatMap((feature) => {
                  const { source, target } = feature.properties as {
                    source?: unknown;
                    target?: unknown;
                  };
                  const confidence = (feature as { confidence?: number }).confidence;
                  // An AI inferred these; a weak one the data never confirms would join
                  // unrelated problems.
                  const trusted =
                    confidence === undefined ||
                    confidence >= MIN_KI_DEPENDENCY_CONFIDENCE ||
                    seen.has(`${source}->${target}`);
                  return typeof source === 'string' && typeof target === 'string' && trusted
                    ? [{ source, target }]
                    : [];
                });
                return [
                  ...fromKis,
                  ...observed
                    .filter(
                      (edge) =>
                        !fromKis.some(
                          (item) => item.source === edge.source && item.target === edge.target
                        )
                    )
                    .map(({ source, target }) => ({ source, target })),
                ];
              })
              .catch((error) => {
                // Without dependencies the engine still works; it just proposes fewer joins.
                scope.logger.debug(`Could not read dependencies: ${getErrorMessage(error)}`);
                return [];
              });
      return dependencies;
    },
  };
}
