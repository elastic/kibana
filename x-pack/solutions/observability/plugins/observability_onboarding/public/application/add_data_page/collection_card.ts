/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntegrationCardItem } from '@kbn/fleet-plugin/public';

/**
 * Fleet collapses packages sharing a `group` manifest id into one collection
 * card (elastic/kibana#283107, behind Fleet's `enableIntegrationCollectionTiles`
 * experimental flag). `groupMembers` is typed locally with the same shape until
 * that PR adds it to `IntegrationCardItem`, so either merge order compiles.
 */
export type GroupedIntegrationCardItem = IntegrationCardItem & {
  groupMembers?: IntegrationCardItem[];
};

export type CollectionCardItem = GroupedIntegrationCardItem & {
  groupMembers: IntegrationCardItem[];
};

/**
 * A card renders as a collection only with at least two members. Fleet already
 * degrades singleton groups to plain tiles, this guard keeps that invariant
 * even if a lone collection card slips through.
 */
export const isCollectionCard = (item: GroupedIntegrationCardItem): item is CollectionCardItem =>
  Boolean(item.isCollectionCard) && (item.groupMembers?.length ?? 0) >= 2;
