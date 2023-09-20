/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTITY_ANALYTICS_URL } from '../../../urls/navigation';
import { RISK_SCORE_URL } from '../../../urls/risk_score';
import { visit } from '../../login';
import { RiskScoreEntity } from '../../risk_scores/common';
import {
  getLegacyRiskScoreIndicesOptions,
  getLegacyRiskScoreLatestIndicesOptions,
} from '../../risk_scores/indices';
import {
  getIngestPipelineName,
  getLegacyIngestPipelineName,
  getLegacyRiskScoreIngestPipelineOptions,
} from '../../risk_scores/ingest_pipelines';
import {
  getLegacyRiskHostCreateInitScriptOptions,
  getLegacyRiskHostCreateLevelScriptOptions,
  getLegacyRiskHostCreateMapScriptOptions,
  getLegacyRiskHostCreateReduceScriptOptions,
  getLegacyRiskScoreInitScriptId,
  getLegacyRiskScoreLevelScriptId,
  getLegacyRiskScoreMapScriptId,
  getLegacyRiskScoreReduceScriptId,
  getLegacyRiskUserCreateLevelScriptOptions,
  getLegacyRiskUserCreateMapScriptOptions,
  getLegacyRiskUserCreateReduceScriptOptions,
  getRiskScoreInitScriptId,
  getRiskScoreLevelScriptId,
  getRiskScoreMapScriptId,
  getRiskScoreReduceScriptId,
} from '../../risk_scores/stored_scripts';
import {
  createTransform,
  deleteTransforms,
  getCreateLegacyLatestTransformOptions,
  getCreateLegacyMLHostPivotTransformOptions,
  getCreateLegacyMLUserPivotTransformOptions,
  getRiskScoreLatestTransformId,
  getRiskScorePivotTransformId,
  startTransforms,
} from '../../risk_scores/transforms';
import { createIndex, deleteRiskScoreIndicies } from './indices';
import { createIngestPipeline, deleteRiskScoreIngestPipelines } from './ingest_pipelines';
import { deleteSavedObjects } from './saved_objects';
import { createStoredScript, deleteStoredScripts } from './stored_scripts';

export const deleteRiskScore = ({
  riskScoreEntity,
  spaceId,
}: {
  riskScoreEntity: RiskScoreEntity;
  spaceId?: string;
}) => {
  const transformIds = [
    getRiskScorePivotTransformId(riskScoreEntity, spaceId),
    getRiskScoreLatestTransformId(riskScoreEntity, spaceId),
  ];
  const legacyIngestPipelineNames = [getLegacyIngestPipelineName(riskScoreEntity)];
  const ingestPipelinesNames = [
    ...legacyIngestPipelineNames,
    getIngestPipelineName(riskScoreEntity, spaceId),
  ];

  const legacyScriptIds = [
    ...(riskScoreEntity === RiskScoreEntity.host
      ? [getLegacyRiskScoreInitScriptId(riskScoreEntity)]
      : []),
    getLegacyRiskScoreLevelScriptId(riskScoreEntity),
    getLegacyRiskScoreMapScriptId(riskScoreEntity),
    getLegacyRiskScoreReduceScriptId(riskScoreEntity),
  ];
  const scripts = [
    ...legacyScriptIds,
    ...(riskScoreEntity === RiskScoreEntity.host
      ? [getRiskScoreInitScriptId(riskScoreEntity, spaceId)]
      : []),
    getRiskScoreLevelScriptId(riskScoreEntity, spaceId),
    getRiskScoreMapScriptId(riskScoreEntity, spaceId),
    getRiskScoreReduceScriptId(riskScoreEntity, spaceId),
  ];

  deleteTransforms(transformIds);
  deleteRiskScoreIngestPipelines(ingestPipelinesNames);
  deleteStoredScripts(scripts);
  deleteSavedObjects(`${riskScoreEntity}RiskScoreDashboards`);
  deleteRiskScoreIndicies(riskScoreEntity, spaceId);
};

/**
 * Scripts id and ingest pipeline id do not have Space ID appended in 8.4.
 * Scripts id and ingest pipeline id in 8.3 and after 8.5 do.
 */
const installLegacyHostRiskScoreModule = (spaceId: string, version?: '8.3' | '8.4') => {
  /**
   * Step 1 Upload script: ml_hostriskscore_levels_script
   */
  createStoredScript(getLegacyRiskHostCreateLevelScriptOptions(version))
    .then(() => {
      /**
       * Step 2 Upload script: ml_hostriskscore_init_script
       */
      return createStoredScript(getLegacyRiskHostCreateInitScriptOptions(version));
    })
    .then(() => {
      /**
       * Step 3 Upload script: ml_hostriskscore_map_script
       */
      return createStoredScript(getLegacyRiskHostCreateMapScriptOptions(version));
    })
    .then(() => {
      /**
       * Step 4 Upload script: ml_hostriskscore_reduce_script
       */
      return createStoredScript(getLegacyRiskHostCreateReduceScriptOptions(version));
    })
    .then(() => {
      /**
       * Step 5 Upload the ingest pipeline: ml_hostriskscore_ingest_pipeline
       */
      return createIngestPipeline(
        getLegacyRiskScoreIngestPipelineOptions(RiskScoreEntity.host, version)
      );
    })
    .then(() => {
      /**
       * Step 6 create ml_host_risk_score_{spaceId} index
       */
      return createIndex(
        getLegacyRiskScoreIndicesOptions({
          spaceId,
          riskScoreEntity: RiskScoreEntity.host,
        })
      );
    })
    .then(() => {
      /**
       * Step 7 create transform: ml_hostriskscore_pivot_transform_{spaceId}
       */
      return createTransform(
        getRiskScorePivotTransformId(RiskScoreEntity.host, spaceId),
        getCreateLegacyMLHostPivotTransformOptions({ spaceId, version })
      );
    })
    .then(() => {
      /**
       * Step 8 create ml_host_risk_score_latest_{spaceId} index
       */
      return createIndex(
        getLegacyRiskScoreLatestIndicesOptions({
          spaceId,
          riskScoreEntity: RiskScoreEntity.host,
        })
      );
    })
    .then(() => {
      /**
       * Step 9 create transform: ml_hostriskscore_latest_transform_{spaceId}
       */
      return createTransform(
        getRiskScoreLatestTransformId(RiskScoreEntity.host, spaceId),
        getCreateLegacyLatestTransformOptions({
          spaceId,
          riskScoreEntity: RiskScoreEntity.host,
        })
      );
    })
    .then(() => {
      /**
       * Step 10 Start the pivot transform
       * Step 11 Start the latest transform
       */
      const transformIds = [
        getRiskScorePivotTransformId(RiskScoreEntity.host, spaceId),
        getRiskScoreLatestTransformId(RiskScoreEntity.host, spaceId),
      ];
      return startTransforms(transformIds);
    })
    .then(() => {
      // refresh page
      visit(ENTITY_ANALYTICS_URL);
    });
};

const installLegacyUserRiskScoreModule = async (spaceId = 'default', version?: '8.3' | '8.4') => {
  /**
   * Step 1 Upload script: ml_userriskscore_levels_script
   */
  createStoredScript(getLegacyRiskUserCreateLevelScriptOptions(version))
    .then(() => {
      /**
       * Step 2 Upload script: ml_userriskscore_map_script
       */
      return createStoredScript(getLegacyRiskUserCreateMapScriptOptions(version));
    })
    .then(() => {
      /**
       * Step 3 Upload script: ml_userriskscore_reduce_script
       */
      return createStoredScript(getLegacyRiskUserCreateReduceScriptOptions(version));
    })
    .then(() => {
      /**
       * Step 4 Upload ingest pipeline: ml_userriskscore_ingest_pipeline
       */
      return createIngestPipeline(
        getLegacyRiskScoreIngestPipelineOptions(RiskScoreEntity.user, version)
      );
    })
    .then(() => {
      /**
       * Step 5 create ml_user_risk_score_{spaceId} index
       */
      return createIndex(
        getLegacyRiskScoreIndicesOptions({
          spaceId,
          riskScoreEntity: RiskScoreEntity.user,
        })
      );
    })
    .then(() => {
      /**
       * Step 6 create Transform: ml_userriskscore_pivot_transform_{spaceId}
       */
      return createTransform(
        getRiskScorePivotTransformId(RiskScoreEntity.user, spaceId),
        getCreateLegacyMLUserPivotTransformOptions({ spaceId, version })
      );
    })
    .then(() => {
      /**
       * Step 7 create ml_user_risk_score_latest_{spaceId} index
       */
      return createIndex(
        getLegacyRiskScoreLatestIndicesOptions({
          spaceId,
          riskScoreEntity: RiskScoreEntity.user,
        })
      );
    })
    .then(() => {
      /**
       * Step 8 create Transform: ml_userriskscore_latest_transform_{spaceId}
       */
      return createTransform(
        getRiskScoreLatestTransformId(RiskScoreEntity.user, spaceId),
        getCreateLegacyLatestTransformOptions({
          spaceId,
          riskScoreEntity: RiskScoreEntity.user,
        })
      );
    })
    .then(() => {
      /**
       * Step 9 Start the pivot transform
       * Step 10 Start the latest transform
       */
      const transformIds = [
        getRiskScorePivotTransformId(RiskScoreEntity.user, spaceId),
        getRiskScoreLatestTransformId(RiskScoreEntity.user, spaceId),
      ];
      return startTransforms(transformIds);
    })
    .then(() => {
      visit(ENTITY_ANALYTICS_URL);
    });
};

export const installLegacyRiskScoreModule = (
  riskScoreEntity: RiskScoreEntity,
  spaceId = 'default',
  version?: '8.3' | '8.4'
) => {
  if (riskScoreEntity === RiskScoreEntity.user) {
    installLegacyUserRiskScoreModule(spaceId, version);
  } else {
    installLegacyHostRiskScoreModule(spaceId, version);
  }
};

export const interceptInstallRiskScoreModule = () => {
  cy.intercept(`POST`, RISK_SCORE_URL).as('install');
};

export const waitForInstallRiskScoreModule = () => {
  cy.wait(['@install'], { requestTimeout: 50000 });
};

export const installRiskScoreModule = () => {
  cy.request({
    url: RISK_SCORE_URL,
    method: 'POST',
    body: {
      riskScoreEntity: 'host',
    },
    headers: { 'kbn-xsrf': 'cypress-creds', 'x-elastic-internal-origin': 'security-solution' },
  })
    .its('status')
    .should('eql', 200);
};
