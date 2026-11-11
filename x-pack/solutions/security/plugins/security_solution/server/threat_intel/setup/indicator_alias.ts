/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  GLOBAL_SPACE_ID,
  PRECISION_IOC_TIERS,
  THREAT_INTEL_INDICATORS_INDEX,
} from '../../../common/threat_intel';

/**
 * The alias a consumer in `spaceId` queries instead of the raw indicators index.
 *
 * `.threat-intel-indicators` holds the full set of candidate indicators for
 * every space, labelled by `space_id` and `ioc_tier`. Neither label is enforced by
 * Elasticsearch: it does not apply Kibana Spaces filtering, and it has no notion of
 * a confidence threshold. So a consumer pointed at the raw index sees every space's
 * intelligence at every confidence level, and the two labels are only as good as
 * each consumer's discipline in filtering on them.
 *
 * A filtered alias moves that from a documented contract to something the cluster
 * enforces. Detection Engine Indicator Match rules point at an alias name and
 * cannot forget to add a filter.
 *
 * What the alias does NOT solve is access. An Indicator Match rule reads its threat
 * index as the rule's own API key, which inherits the rule author's Elasticsearch
 * roles, not their Kibana feature privileges. The built-in `viewer` role grants read on
 * everything that does not start with a dot, plus a hand-maintained list of dotted
 * exceptions in Elasticsearch's `ReservedRolesStore`. That is why the index sits outside
 * `.kibana-`, which is on no such list, and why the grant added there is on
 * `.threat-intel-indicators-*`: the trailing hyphen matches these per-space aliases and
 * never the raw index. On a deployment whose Elasticsearch predates that grant, an
 * operator has to add `read` on `.threat-intel-indicators-*` by hand. The alias narrows
 * what a reader sees; it does not make them a reader.
 *
 * The space id is never at the start of the name, so a space id beginning with `-`
 * or `_` (which Kibana permits and Elasticsearch rejects in an alias) cannot
 * produce an invalid name.
 */
export const indicatorAliasForSpace = (spaceId: string): string =>
  `${THREAT_INTEL_INDICATORS_INDEX}-${spaceId}`;

/**
 * Filter behind a space's alias.
 *
 * Two terms, and both matter. `space_id` accepts the space plus the global
 * sentinel, matching how reports and sources are read: indicators derived from a
 * seeded global feed belong to everyone, indicators derived from another space's
 * private reports do not. `ioc_tier` keeps the alias to the precision tiers, so
 * `uncertain` candidates stay queryable on the raw index for hunting but never
 * reach a rule that alerts.
 */
const aliasFilter = (spaceId: string): estypes.QueryDslQueryContainer => ({
  bool: {
    filter: [
      { terms: { space_id: [spaceId, GLOBAL_SPACE_ID] } },
      { terms: { ioc_tier: [...PRECISION_IOC_TIERS] } },
    ],
  },
});

/** Terms values at a clause path, if the clause is a `terms` on that field. */
const termsValues = (clause: unknown, field: string): string[] | undefined => {
  const terms = (clause as { terms?: Record<string, unknown> } | undefined)?.terms;
  const values = terms?.[field];
  return Array.isArray(values) ? values.map(String) : undefined;
};

const sameSet = (a: readonly string[] | undefined, b: readonly string[]): boolean =>
  !!a && a.length === b.length && [...a].sort().join('\u0000') === [...b].sort().join('\u0000');

/**
 * Whether the stored filter already says what we want it to say.
 *
 * Compared semantically rather than by `JSON.stringify` equality. Elasticsearch parses
 * a filter into its query DSL and re-serializes it on read, so the returned form can
 * differ from what was sent by clause order, key order, or added defaults like `boost`,
 * none of which change meaning. An exact-string comparison would then never match, and
 * since this runs on request paths the result would be a master-node cluster-state
 * write on every single call, which is the precise thing the check exists to avoid.
 */
const aliasFilterMatches = (current: unknown, spaceId: string): boolean => {
  const clauses = (current as { bool?: { filter?: unknown[] } } | undefined)?.bool?.filter;
  // Exactly the two clauses we write, no more. The point of this function is to repair a
  // filter that has drifted, so anything beyond `space_id` and `ioc_tier` terms (an extra
  // narrowing clause, a duplicate `space_id`, a `must_not`) is drift we did not intend and
  // must trigger a rewrite rather than be silently accepted.
  if (!Array.isArray(clauses) || clauses.length !== 2) return false;

  // Classify each clause independently instead of picking the first match, so an empty or
  // duplicate `terms` cannot be chosen ahead of the real one.
  let spaces: string[] | undefined;
  let tiers: string[] | undefined;
  for (const clause of clauses) {
    const clauseSpaces = termsValues(clause, 'space_id');
    const clauseTiers = termsValues(clause, 'ioc_tier');
    if (clauseSpaces && !clauseTiers && spaces === undefined) {
      spaces = clauseSpaces;
    } else if (clauseTiers && !clauseSpaces && tiers === undefined) {
      tiers = clauseTiers;
    } else {
      return false;
    }
  }

  return sameSet(spaces, [spaceId, GLOBAL_SPACE_ID]) && sameSet(tiers, [...PRECISION_IOC_TIERS]);
};

/**
 * Creates or repairs the filtered alias for one space. Idempotent.
 *
 * Reads the current definition first and only writes when it is missing or has
 * drifted, because `putAlias` is a cluster-state update handled by the master node
 * and this is called from request paths, not just at boot.
 *
 * Failure is logged rather than thrown. A missing alias means a consumer gets an
 * index-not-found error, which is a visible and safe failure; throwing here would
 * instead take down whatever was trying to set it up.
 */
export const ensureIndicatorAliasForSpace = async ({
  esClient,
  spaceId,
  logger,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  logger: Logger;
}): Promise<void> => {
  const log = logger.get('indicator-alias');
  const alias = indicatorAliasForSpace(spaceId);
  const filter = aliasFilter(spaceId);

  try {
    const existing = await esClient.indices.getAlias(
      { name: alias, index: THREAT_INTEL_INDICATORS_INDEX },
      { ignore: [404] }
    );
    const current = existing?.[THREAT_INTEL_INDICATORS_INDEX]?.aliases?.[alias]?.filter;

    if (aliasFilterMatches(current, spaceId)) {
      return;
    }

    await esClient.indices.putAlias({
      index: THREAT_INTEL_INDICATORS_INDEX,
      name: alias,
      filter,
    });
    log.info(
      `Installed filtered indicator alias ${alias} (space_id in [${spaceId}, ${GLOBAL_SPACE_ID}], ` +
        `ioc_tier in [${PRECISION_IOC_TIERS.join(', ')}])`
    );
  } catch (err) {
    log.error(
      `Failed to install the filtered indicator alias ${alias}: ${(err as Error).message}. ` +
        `Consumers in space '${spaceId}' have no space-scoped, tier-filtered view of ` +
        `${THREAT_INTEL_INDICATORS_INDEX} until this succeeds. Do not point a detection rule ` +
        `at the raw index as a workaround: it carries every space's intelligence at every ` +
        `confidence level.`
    );
  }
};
