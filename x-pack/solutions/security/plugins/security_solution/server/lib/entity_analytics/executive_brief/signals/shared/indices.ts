/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX,
  ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX,
} from '@kbn/elastic-assistant-common';
import { ENTITY_LATEST, ENTITY_METADATA, getEntitiesAlias } from '@kbn/entity-store/common';
import { DEFAULT_ALERTS_INDEX } from '../../../../../../common/constants';
import { getRiskScoreTimeSeriesIndex } from '../../../../../../common/entity_analytics/risk_engine/indices';
import { getLeadsIndexName } from '../../../../../../common/entity_analytics/lead_generation/constants';

/** The one place signals get index names from, so no signal hard-codes its own. */

export const getAlertsIndex = (spaceId: string): string => `${DEFAULT_ALERTS_INDEX}-${spaceId}`;

/** Entity Store v2 latest entities (golden and alias docs). */
export const getEntitiesLatestIndex = (spaceId: string): string =>
  getEntitiesAlias(ENTITY_LATEST, spaceId);

/** Entity Store v2 metadata log (relationship observations, AI summaries, ...). */
export const getEntitiesMetadataIndex = (spaceId: string): string =>
  getEntitiesAlias(ENTITY_METADATA, spaceId);

/** Scheduled and ad-hoc Attack Discovery alerts for a space. */
export const getAttackDiscoveryIndices = (spaceId: string): string[] => [
  `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-${spaceId}`,
  `${ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX}-${spaceId}`,
];

export const getRiskScoreHistoryIndex = (spaceId: string): string =>
  getRiskScoreTimeSeriesIndex(spaceId);

export const getHuntingLeadsIndex = (spaceId: string): string => getLeadsIndexName(spaceId);
