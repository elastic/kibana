/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { SmlTypeDefinition } from '@kbn/agent-builder-sml-plugin/server';
import { kibanaPermissions } from '@kbn/agent-builder-sml-plugin/server';
import { PREBUILT_RULE_SML_TYPE } from '@kbn/security-solution-features/constants';
import { createPrebuiltRuleAssetsClient } from '../../lib/detection_engine/prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import type { PrebuiltRuleAsset } from '../../lib/detection_engine/prebuilt_rules/model/rule_assets/prebuilt_rule_asset';

/** SML record type id. The semantic prebuilt-rule tool filters on this. */
export { PREBUILT_RULE_SML_TYPE };

const DEFAULT_FETCH_FREQUENCY = '60m';
// Increment when the indexed representation changes. The crawler compares this
// millisecond with its stored timestamp, so existing rules are refreshed once
// without disturbing the monotonic ordering of future rule versions.
const INDEX_REVISION_MS = 1;

const MAX_QUERY_CHARS = 2000;
const MAX_DESCRIPTION_CHARS = 2000;

const truncate = (value: string | undefined, max: number): string =>
  !value ? '' : value.length > max ? `${value.slice(0, max)}…` : value;

const collectMitreIds = (asset: PrebuiltRuleAsset): string[] => {
  const ids = new Set<string>();
  for (const entry of asset.threat ?? []) {
    if (entry.tactic?.id) ids.add(entry.tactic.id);
    for (const technique of entry.technique ?? []) {
      if (technique.id) ids.add(technique.id);
      for (const sub of technique.subtechnique ?? []) {
        if (sub.id) ids.add(sub.id);
      }
    }
  }
  return [...ids];
};

const contentOf = (asset: PrebuiltRuleAsset): string =>
  [
    asset.name,
    truncate(asset.description, MAX_DESCRIPTION_CHARS),
    truncate('query' in asset ? asset.query : undefined, MAX_QUERY_CHARS),
    ('index' in asset ? asset.index ?? [] : []).join(', '),
    collectMitreIds(asset).join(', '),
    (asset.tags ?? []).join(', '),
  ]
    .filter(Boolean)
    .join('\n');

interface CreatePrebuiltRuleSmlTypeOptions {
  getSavedObjectsClient: () => Promise<SavedObjectsClientContract>;
  /** Override the production cadence for development and focused tests. */
  fetchFrequency?: string;
  /**
   * Every space id in the deployment.
   *
   * Prebuilt rule assets are namespace-agnostic saved objects, so they genuinely exist in
   * all spaces. `spaces: ['*']` says exactly that and SML's DSL read paths honour it, but
   * its ES|QL search path filters with `MV_CONTAINS(spaces, <spaceId>)` and never matches
   * the wildcard, which makes the entries invisible to the very search this type exists
   * for. Listing the concrete spaces is therefore not a workaround for an unknown, it is
   * the shape that search can actually read.
   */
  getSpaceIds: () => Promise<string[]>;
}

/**
 * Makes the INSTALLABLE prebuilt rule catalog semantically searchable.
 *
 * The sibling type indexes rules that are installed in the deployment. This one indexes
 * the catalog they come from, which is what the "is there already an Elastic rule for
 * this?" question actually searches. Both are needed: a gap can be closed by enabling
 * something installed or by installing something that is not.
 *
 * Cost note: a deployment with the detection package installed holds a few thousand rule
 * assets, but only a couple of thousand distinct rules, because every version is its own
 * saved object. `fetchLatestAssets` collapses that to the current version of each rule, so
 * inference runs once per rule rather than once per version. The crawler then skips
 * unchanged rules, so a package upgrade re-embeds only the rules that actually moved.
 */
export const createPrebuiltRuleSmlType = ({
  getSavedObjectsClient,
  getSpaceIds,
  fetchFrequency = DEFAULT_FETCH_FREQUENCY,
}: CreatePrebuiltRuleSmlTypeOptions): SmlTypeDefinition => {
  /**
   * The catalog is fetched whole, so it is held for the duration of a crawl pass rather
   * than re-fetched per rule: the crawler calls `list` once and then `getSmlEntry` for
   * every changed rule, and without this a pass would refetch a few thousand assets a few
   * thousand times.
   */
  let cachedAssets: Map<string, PrebuiltRuleAsset> | undefined;

  const loadAssets = async (): Promise<Map<string, PrebuiltRuleAsset>> => {
    const client = createPrebuiltRuleAssetsClient(await getSavedObjectsClient());
    const assets = await client.fetchLatestAssets();
    return new Map(assets.map((asset) => [asset.rule_id, asset]));
  };

  return {
    id: PREBUILT_RULE_SML_TYPE,
    fetchFrequency: () => fetchFrequency,

    async *list() {
      const [assets, spaces] = await Promise.all([loadAssets(), getSpaceIds()]);
      cachedAssets = assets;
      // Keyed by the stable `rule_id`, never by the asset saved-object id: prebuilt rules
      // ship one saved object PER VERSION, so keying on the saved object would index the
      // same rule several times and let stale descriptions compete with the current one.
      yield [...assets.values()].map((asset) => ({
        id: asset.rule_id,
        // The crawler needs a timestamp that rises whenever the content changes. Catalog
        // rules carry no edit time, only a monotonically rising `version`, so the version
        // is expressed as an epoch offset: same rule, same string; upgraded rule, later
        // string, which is exactly the change signal the crawler diffs on.
        updatedAt: new Date(asset.version * 1000 + INDEX_REVISION_MS).toISOString(),
        spaces,
      }));
    },

    getSmlEntry: async (originId, context) => {
      try {
        const assets = cachedAssets ?? (await loadAssets());
        const asset = assets.get(originId);
        if (!asset) {
          return undefined;
        }
        return {
          type: PREBUILT_RULE_SML_TYPE,
          title: asset.name,
          content: contentOf(asset),
          description: truncate(asset.description, MAX_DESCRIPTION_CHARS),
          tags: asset.tags ?? [],
        };
      } catch (error) {
        context.logger.warn(
          `SML prebuilt rule: failed to read '${originId}': ${(error as Error).message}`
        );
        return undefined;
      }
    },

    // The installable catalog follows the same Rules feature read boundary as installed
    // detection rules. The indexer expands this action into one independently gated group
    // per concrete space.
    getPermissions: () => kibanaPermissions({ kiType: PREBUILT_RULE_SML_TYPE }),

    /**
     * A rule that is not installed has nothing to attach: the rule attachment expects a
     * real rule. Installing it is the action, and that belongs to the workflow.
     */
    toAttachment: async () => undefined,
  };
};
