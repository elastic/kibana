/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import type { AssetCriticalityLevel, Entity } from '@kbn/entity-store/common';
import type { ResolutionClient, ResolutionGroup } from '@kbn/entity-store/server';
import { getHigherCriticality } from '../../../risk_score/maintainer/steps/resolution_modifiers';

/** The group's golden record, with the group's highest criticality and all of its watchlists. */
const mergeGroup = ({ target, aliases }: ResolutionGroup): Entity => {
  if (aliases.length === 0) {
    return target;
  }
  const members = [target, ...aliases];
  const criticality = members.reduce<AssetCriticalityLevel | null | undefined>(
    (highest, { asset }) => getHigherCriticality(highest, asset?.criticality),
    undefined
  );
  const watchlists = uniq(
    members.flatMap(({ entity }) => entity?.attributes?.watchlists ?? [])
  ).sort();
  return {
    ...target,
    entity: { ...target.entity, attributes: { ...target.entity?.attributes, watchlists } },
    asset: criticality ? { ...target.asset, criticality } : target.asset,
  };
};

/** Each EUID's golden record from Entity Store resolution; EUIDs the store doesn't have are left out. */
export const resolveEntities = async ({
  resolutionClient,
  euids,
  abortSignal,
}: {
  resolutionClient: ResolutionClient;
  euids: string[];
  abortSignal: AbortSignal;
}): Promise<Map<string, Entity>> => {
  const groups = await resolutionClient.getResolutionGroups(euids, { abortSignal });
  return new Map([...groups].map(([euid, group]) => [euid, mergeGroup(group)]));
};
