/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euid, buildEntityFiltersFromEntityIdentifiers } from '@kbn/entity-store/common';
import { EntityTypeToIdentifierField, EntityType } from '../../../../entity_analytics/types';
import type { ESQuery } from '../../../../typed_json';
import {
  getRiskScoreLatestIndex,
  getRiskScoreTimeSeriesIndex,
} from '../../../../entity_analytics/risk_engine';

export const getRiskIndex = (spaceId: string, onlyLatest: boolean = true): string => {
  return onlyLatest ? getRiskScoreLatestIndex(spaceId) : getRiskScoreTimeSeriesIndex(spaceId);
};

export const buildHostNamesFilter = (hostNames: string[]) => {
  return buildEntityNameFilter(EntityType.host, hostNames);
};

export const buildUserNamesFilter = (userNames: string[]) => {
  return buildEntityNameFilter(EntityType.user, userNames);
};

export const buildEntityNameFilter = (riskEntity: EntityType, entityNames: string[]): ESQuery => {
  return { terms: { [EntityTypeToIdentifierField[riskEntity]]: entityNames } };
};

export { buildEntityFiltersFromEntityIdentifiers };

/**
 * Builds an Elasticsearch filter for host queries based on entityIdentifiers.
 * Uses EUID priority from entity_store common (see getEuidDslFilterBasedOnDocument).
 * @param entityIdentifiers - Key-value pairs of field names and their values (used as document for EUID)
 * @returns ESQuery filter object, or undefined if no valid identifiers found
 */
export const buildHostFilterFromEntityIdentifiers = (
  entityIdentifiers: Record<string, string>
): ESQuery | undefined => {
  const filter = euid.getEuidDslFilterBasedOnDocument('host', entityIdentifiers);
  return filter as ESQuery | undefined;
};

export { EntityType };
