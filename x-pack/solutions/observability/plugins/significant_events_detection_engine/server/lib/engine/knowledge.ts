/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { QueryLink } from '@kbn/significant-events-schema';
import { getErrorMessage } from '../errors';
import type { Dependency } from '../pipeline/join_proposals';
import type { IEngineScope } from './engine_scope';

/** What the engine reads from knowledge in one run. */
export interface IRunKnowledge {
  /** Match queries of the enabled sources, promoted or not. Read once, on first use. */
  getQueryLinks(): Promise<QueryLink[]>;
  /** Service dependencies, for join proposals and related services. Never throws. */
  getDependencies(): Promise<Dependency[]>;
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

    getDependencies() {
      dependencies ??=
        sourceIds.length === 0
          ? Promise.resolve([])
          : scope
              .getKnowledgeIndicatorClient()
              .then((client) => client.getFeatures(sourceIds, { type: ['dependency'] }))
              .then(({ hits }) =>
                hits.flatMap((feature) => {
                  const { source, target } = feature.properties as {
                    source?: unknown;
                    target?: unknown;
                  };
                  return typeof source === 'string' && typeof target === 'string'
                    ? [{ source, target }]
                    : [];
                })
              )
              .catch((error) => {
                // Without dependencies the engine still works; it just proposes fewer joins.
                scope.logger.debug(`Could not read dependencies: ${getErrorMessage(error)}`);
                return [];
              });
      return dependencies;
    },
  };
}
