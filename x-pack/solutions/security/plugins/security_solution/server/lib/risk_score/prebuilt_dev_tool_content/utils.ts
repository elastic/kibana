/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RiskScoreEntity } from '../../../../common/search_strategy';
import {
  getCreateLatestTransformOptions,
  getCreateMLHostPivotTransformOptions,
  getCreateMLUserPivotTransformOptions,
  getCreateRiskScoreIndicesOptions,
  getCreateRiskScoreLatestIndicesOptions,
  getRiskScoreIngestPipelineOptions,
  getRiskScoreLatestTransformId,
  getRiskScorePivotTransformId,
  getRiskHostCreateInitScriptOptions,
  getRiskHostCreateLevelScriptOptions,
  getRiskHostCreateMapScriptOptions,
  getRiskHostCreateReduceScriptOptions,
  getRiskUserCreateLevelScriptOptions,
  getRiskUserCreateMapScriptOptions,
  getRiskUserCreateReduceScriptOptions,
} from '../../../../common/utils/risk_score_modules';

const getRiskyHostPrebuiltDevToolsContent = ({ spaceId = 'default' }: { spaceId?: string }) => {
  const riskScoreEntity = RiskScoreEntity.host;
  const stringifyScript = true;
  return {
    spaceId,
    createLevelScriptOptions: getRiskHostCreateLevelScriptOptions(spaceId, stringifyScript),
    createInitScriptOptions: getRiskHostCreateInitScriptOptions(spaceId, stringifyScript),
    createMapScriptOptions: getRiskHostCreateMapScriptOptions(spaceId, stringifyScript),
    createReduceScriptOptions: getRiskHostCreateReduceScriptOptions(spaceId, stringifyScript),
    createIngestPipelineOptions: getRiskScoreIngestPipelineOptions(
      riskScoreEntity,
      spaceId,
      stringifyScript
    ),
    createRiskScoreIndicesOptions: getCreateRiskScoreIndicesOptions({
      spaceId,
      riskScoreEntity,
      stringifyScript,
    }),
    createRiskScoreLatestIndicesOptions: getCreateRiskScoreLatestIndicesOptions({
      spaceId,
      riskScoreEntity,
      stringifyScript,
    }),
    pivotTransformId: getRiskScorePivotTransformId(riskScoreEntity, spaceId),
    pivotTransformOptions: getCreateMLHostPivotTransformOptions({
      spaceId,
      stringifyScript,
    }),
    latestTransformId: getRiskScoreLatestTransformId(riskScoreEntity, spaceId),
    latestTransformOptions: getCreateLatestTransformOptions({
      spaceId,
      riskScoreEntity,
      stringifyScript,
    }),
  };
};

const getRiskyUserPrebuiltDevToolsContent = ({ spaceId = 'default' }: { spaceId?: string }) => {
  const riskScoreEntity = RiskScoreEntity.user;
  const stringifyScript = true;
  return {
    spaceId,
    createLevelScriptOptions: getRiskUserCreateLevelScriptOptions(spaceId, stringifyScript),
    createMapScriptOptions: getRiskUserCreateMapScriptOptions(spaceId, stringifyScript),
    createReduceScriptOptions: getRiskUserCreateReduceScriptOptions(spaceId, stringifyScript),
    createIngestPipelineOptions: getRiskScoreIngestPipelineOptions(
      riskScoreEntity,
      spaceId,
      stringifyScript
    ),
    createRiskScoreIndicesOptions: getCreateRiskScoreIndicesOptions({
      spaceId,
      riskScoreEntity,
      stringifyScript,
    }),
    createRiskScoreLatestIndicesOptions: getCreateRiskScoreLatestIndicesOptions({
      spaceId,
      riskScoreEntity,
      stringifyScript,
    }),
    pivotTransformId: getRiskScorePivotTransformId(riskScoreEntity, spaceId),
    pivotTransformOptions: getCreateMLUserPivotTransformOptions({
      spaceId,
      stringifyScript,
    }),
    latestTransformId: getRiskScoreLatestTransformId(riskScoreEntity, spaceId),
    latestTransformOptions: getCreateLatestTransformOptions({
      spaceId,
      riskScoreEntity,
      stringifyScript,
    }),
  };
};

export const getView = ({
  spaceId = 'default',
  riskScoreEntity,
}: {
  spaceId?: string;
  riskScoreEntity: RiskScoreEntity;
}) => {
  if (riskScoreEntity === RiskScoreEntity.user) {
    return getRiskyUserPrebuiltDevToolsContent({ spaceId });
  }

  return getRiskyHostPrebuiltDevToolsContent({ spaceId });
};
