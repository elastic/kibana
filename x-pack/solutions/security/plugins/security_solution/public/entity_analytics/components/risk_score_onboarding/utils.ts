/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { StartRenderServices } from '../../../types';
import { EntityType } from '../../../../common/search_strategy';
import * as utils from '../../../../common/utils/risk_score_modules';
import type { inputsModel } from '../../../common/store';

import {
  deleteStoredScripts,
  deleteTransforms,
  deleteIngestPipelines,
  bulkDeletePrebuiltSavedObjects,
  installRiskScore,
  bulkCreatePrebuiltSavedObjects,
  stopTransforms,
  startTransforms,
} from '../../deprecated_risk_engine/api';
import {
  INGEST_PIPELINE_DELETION_ERROR_MESSAGE,
  TRANSFORM_DELETION_ERROR_MESSAGE,
  UNINSTALLATION_ERROR,
} from '../../deprecated_risk_engine/api/translations';

interface InstallRiskScoreModule {
  share?: SharePluginStart;
  http: HttpSetup;
  refetch?: inputsModel.Refetch;
  renderDashboardLink?: (message: string, dashboardUrl: string) => React.ReactNode;
  renderDocLink?: (message: string) => React.ReactNode;
  riskScoreEntity: EntityType;
  spaceId?: string;
  timerange: {
    from: string;
    to: string;
  };
  startServices: StartRenderServices;
}

type UpgradeRiskScoreModule = InstallRiskScoreModule;

const installHostRiskScoreModule = async ({
  share,
  http,
  refetch,
  renderDashboardLink,
  renderDocLink,
  timerange,
  startServices,
}: InstallRiskScoreModule) => {
  await installRiskScore({
    http,
    renderDocLink,
    options: {
      riskScoreEntity: EntityType.host,
    },
    startServices,
  });

  // Install dashboards and relevant saved objects
  await bulkCreatePrebuiltSavedObjects({
    http,
    share,
    renderDashboardLink,
    renderDocLink,
    ...timerange,
    options: {
      templateName: `${EntityType.host}RiskScoreDashboards`,
    },
    startServices,
  });

  if (refetch) {
    refetch();
  }
};

const installUserRiskScoreModule = async ({
  share,
  http,
  refetch,
  renderDashboardLink,
  renderDocLink,
  spaceId = 'default',
  timerange,
  startServices,
}: InstallRiskScoreModule) => {
  await installRiskScore({
    http,
    renderDocLink,
    options: {
      riskScoreEntity: EntityType.user,
    },
    startServices,
  });

  // Install dashboards and relevant saved objects
  await bulkCreatePrebuiltSavedObjects({
    share,
    http,
    options: {
      templateName: `${EntityType.user}RiskScoreDashboards`,
    },
    renderDashboardLink,
    renderDocLink,
    startServices,
    ...timerange,
  });

  if (refetch) {
    refetch();
  }
};

export const installRiskScoreModule = async (settings: InstallRiskScoreModule) => {
  if (settings.riskScoreEntity === EntityType.user) {
    await installUserRiskScoreModule(settings);
  } else {
    await installHostRiskScoreModule(settings);
  }
};

export const uninstallRiskScoreModule = async ({
  http,
  refetch,
  renderDocLink,
  riskScoreEntity,
  spaceId = 'default',
  startServices,
}: {
  http: HttpSetup;
  refetch?: inputsModel.Refetch;
  renderDocLink?: (message: string) => React.ReactNode;
  riskScoreEntity: EntityType;
  spaceId?: string;
  deleteAll?: boolean;
  startServices: StartRenderServices;
}) => {
  const legacyTransformIds = [
    // transform Ids never changed since 8.3
    utils.getRiskScorePivotTransformId(riskScoreEntity, spaceId),
    utils.getRiskScoreLatestTransformId(riskScoreEntity, spaceId),
  ];
  const legacyRiskScoreHostsScriptIds = [
    // 8.4
    utils.getLegacyRiskScoreLevelScriptId(EntityType.host),
    utils.getLegacyRiskScoreInitScriptId(EntityType.host),
    utils.getLegacyRiskScoreMapScriptId(EntityType.host),
    utils.getLegacyRiskScoreReduceScriptId(EntityType.host),
    // 8.3 and after 8.5
    utils.getRiskScoreLevelScriptId(EntityType.host, spaceId),
    utils.getRiskScoreInitScriptId(EntityType.host, spaceId),
    utils.getRiskScoreMapScriptId(EntityType.host, spaceId),
    utils.getRiskScoreReduceScriptId(EntityType.host, spaceId),
  ];
  const legacyRiskScoreUsersScriptIds = [
    // 8.4
    utils.getLegacyRiskScoreLevelScriptId(EntityType.user),
    utils.getLegacyRiskScoreMapScriptId(EntityType.user),
    utils.getLegacyRiskScoreReduceScriptId(EntityType.user),
    // 8.3 and after 8.5
    utils.getRiskScoreLevelScriptId(EntityType.user, spaceId),
    utils.getRiskScoreMapScriptId(EntityType.user, spaceId),
    utils.getRiskScoreReduceScriptId(EntityType.user, spaceId),
  ];

  const legacyIngestPipelineNames = [
    // 8.4
    utils.getLegacyIngestPipelineName(riskScoreEntity),
    // 8.3 and 8.5
    utils.getIngestPipelineName(riskScoreEntity, spaceId),
  ];

  await Promise.all([
    /**
     * Intended not to pass notification to bulkDeletePrebuiltSavedObjects.
     * As the only error it can happen is saved object not found, and
     * that is what bulkDeletePrebuiltSavedObjects wants.
     * (Before 8.5 once an saved object was created, it was shared across different spaces.
     * If it has been upgrade in one space, "saved object not found" will happen when upgrading other spaces.
     * Or it could be users manually deleted the saved object.)
     */
    bulkDeletePrebuiltSavedObjects({
      http,
      options: {
        templateName: `${riskScoreEntity}RiskScoreDashboards`,
      },
      startServices,
    }),
    deleteTransforms({
      http,
      renderDocLink,
      errorMessage: `${UNINSTALLATION_ERROR} - ${TRANSFORM_DELETION_ERROR_MESSAGE(
        legacyTransformIds.length
      )}`,
      transformIds: legacyTransformIds,
      options: {
        deleteDestIndex: true,
        deleteDestDataView: true,
        forceDelete: false,
      },
      startServices,
    }),
    /**
     * Intended not to pass notification to deleteIngestPipelines.
     * As the only error it can happen is ingest pipeline not found, and
     * that is what deleteIngestPipelines wants.
     * (Before 8.5 once an ingest pipeline was created, it was shared across different spaces.
     * If it has been upgrade in one space, "ingest pipeline not found" will happen when upgrading other spaces.
     * Or it could be users manually deleted the ingest pipeline.)
     */
    deleteIngestPipelines({
      http,
      errorMessage: `${UNINSTALLATION_ERROR} - ${INGEST_PIPELINE_DELETION_ERROR_MESSAGE(
        legacyIngestPipelineNames.length
      )}`,
      names: legacyIngestPipelineNames.join(','),
      startServices,
    }),
    /**
     * Intended not to pass notification to deleteStoredScripts.
     * As the only error it can happen is script not found, and
     * that is what deleteStoredScripts wants.
     * (In 8.4 once a script was created, it was shared across different spaces.
     * If it has been upgrade in one space, "script not found" will happen when upgrading other spaces.
     * Or it could be users manually deleted the script.)
     */
    deleteStoredScripts({
      http,
      ids:
        riskScoreEntity === EntityType.user
          ? legacyRiskScoreUsersScriptIds
          : legacyRiskScoreHostsScriptIds,
      startServices,
    }),
  ]);

  if (refetch) {
    refetch();
  }
};

export const upgradeHostRiskScoreModule = async ({
  share,
  http,
  refetch,
  renderDashboardLink,
  renderDocLink,
  spaceId = 'default',
  timerange,
  startServices,
}: UpgradeRiskScoreModule) => {
  await uninstallRiskScoreModule({
    http,
    renderDocLink,
    riskScoreEntity: EntityType.host,
    spaceId,
    startServices,
  });
  await installRiskScoreModule({
    share,
    http,
    refetch,
    renderDashboardLink,
    renderDocLink,
    riskScoreEntity: EntityType.host,
    spaceId,
    timerange,
    startServices,
  });
};

export const upgradeUserRiskScoreModule = async ({
  share,
  http,
  refetch,
  renderDashboardLink,
  renderDocLink,
  spaceId = 'default',
  timerange,
  startServices,
}: UpgradeRiskScoreModule) => {
  await uninstallRiskScoreModule({
    http,
    renderDocLink,
    riskScoreEntity: EntityType.user,
    spaceId,
    startServices,
  });
  await installRiskScoreModule({
    share,
    http,
    refetch,
    renderDashboardLink,
    renderDocLink,
    riskScoreEntity: EntityType.user,
    spaceId,
    timerange,
    startServices,
  });
};

export const restartRiskScoreTransforms = async ({
  http,
  refetch,
  renderDocLink,
  riskScoreEntity,
  spaceId,
  startServices,
}: {
  http: HttpSetup;
  refetch?: inputsModel.Refetch;
  renderDocLink?: (message: string) => React.ReactNode;
  riskScoreEntity: EntityType;
  spaceId?: string;
  startServices: StartRenderServices;
}) => {
  const transformIds = [
    utils.getRiskScorePivotTransformId(riskScoreEntity, spaceId),
    utils.getRiskScoreLatestTransformId(riskScoreEntity, spaceId),
  ];

  await stopTransforms({
    http,
    renderDocLink,
    transformIds,
    startServices,
  });

  const res = await startTransforms({
    http,
    renderDocLink,
    transformIds,
    startServices,
  });

  if (refetch) {
    refetch();
  }

  return res;
};
