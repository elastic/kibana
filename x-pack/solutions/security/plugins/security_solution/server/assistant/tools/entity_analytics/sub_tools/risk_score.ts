/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RiskEngineDataClient } from '../../../../lib/entity_analytics/risk_engine/risk_engine_data_client';
import { EntityTypeToIdentifierField } from '../../../../../common/entity_analytics/types';
import type { EntityType } from '../../../../../common/search_strategy';
import {
  EntityTypeToLevelField,
  EntityTypeToScoreField,
} from '../../../../../common/search_strategy';
import {
  getRiskScoreLatestIndex,
  getRiskScoreTimeSeriesIndex,
} from '../../../../../common/entity_analytics/risk_engine';
import type { EntityAnalyticsSubPlugin } from './types';

export const getRiskScoreSubPlugin: EntityAnalyticsSubPlugin = async (
  entityType: EntityType,
  { spaceId, soClient, request, logger, esClient, kibanaVersion }
) => {
  const riskScoreIndexPattern = getRiskScoreLatestIndex(spaceId);
  const riskScoreTimeSeriesIndexPattern = getRiskScoreTimeSeriesIndex(spaceId);

  const riskEngineClient = new RiskEngineDataClient({
    logger,
    kibanaVersion,
    esClient: esClient.asCurrentUser,
    soClient,
    namespace: spaceId,
    auditLogger: undefined,
  });

  const engineStatus = await riskEngineClient.getStatus({ namespace: spaceId });

  if (engineStatus.riskEngineStatus === 'ENABLED') {
    return {
      message: `This is a set of rules that you must follow strictly:
  * Use the latest risk score index pattern: ${riskScoreIndexPattern} when answering questions about the current risk score of entities.
  * Use the risk score time series patterns: ${riskScoreTimeSeriesIndexPattern} when answering questions about how the risk score changes over time.
  * When querying the risk score for a entity you must **ALWAYS** use the normalized field '${EntityTypeToScoreField[entityType]}'.
  * The field '${EntityTypeToLevelField[entityType]}' contains a textual description of the risk level.
  * The inputs field inside the risk score document contains the 10 highest-risk documents (sorted by 'kibana.alert.risk_score') that contributed to the risk score of an entity.
  * When searching the risk score of an entity of type '${entityType}' you must **ALWAYS** filter by: 'where ${EntityTypeToIdentifierField[entityType]} IS NOT NULL'`,
      index: riskScoreIndexPattern,
    };
  } else {
    return {
      message: `The risk engine is not enabled in this environment. The current status is: ${engineStatus.riskEngineStatus}. The user needs to enable the risk engine se this assistant can answer risk related questions.`,
    };
  }
};
