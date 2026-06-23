/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  IUiSettingsClient,
  Logger,
  KibanaRequest,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { Entity } from '@kbn/entity-store/common';
import type { MlPluginSetup, MlSummaryJob } from '@kbn/ml-plugin/server';
import { euid } from '@kbn/entity-store/common/euid_helpers';
import type { ExperimentalFeatures } from '../../../../../../common';
import type { EntityAnalyticsRoutesDeps } from '../../../types';
import { getThreshold } from '../../../../../../common/utils/ml';
import { isSecurityJob } from '../../../../../../common/machine_learning/is_security_job';
import { DEFAULT_ANOMALY_SCORE } from '../../../../../../common/constants';
import type { EntityType } from '../../../../../../common/entity_analytics/types';
import { getEntityAnomalies } from '../../../anomaly_summary';

type Ml = EntityAnalyticsRoutesDeps['ml'];

export interface AnomalyRecord {
  source: Record<string, unknown>;
  job?: {
    name: string;
    description?: string;
  };
}

interface GetAnomalyDataOptions {
  entities: Entity[];
  esClient: ElasticsearchClient;
  experimentalFeatures: ExperimentalFeatures;
  fromDate: number;
  toDate: number;
  logger: Logger;
  ml: Ml;
  soClient: SavedObjectsClientContract;
  uiSettingsClient: IUiSettingsClient;
}

const getSecurityJobIds = async (
  ml: MlPluginSetup,
  soClient: SavedObjectsClientContract
): Promise<{
  securityJobIds: string[];
  jobMetaById: Record<string, { name: string; description: string }>;
}> => {
  const request = {} as KibanaRequest;
  const jobs: MlSummaryJob[] = await ml.jobServiceProvider(request, soClient).jobsSummary();
  const securityJobIds = jobs.filter(isSecurityJob).map((j) => j.id);

  const jobMetaById = jobs.reduce<Record<string, { name: string; description: string }>>(
    (acc, job) => {
      acc[job.id] = {
        name: job.customSettings?.security_app_display_name ?? job.id,
        description: job.description,
      };
      return acc;
    },
    {}
  );

  return { securityJobIds, jobMetaById };
};

type GetAnomalyDataFromApiOpts = Omit<
  GetAnomalyDataOptions,
  'experimentalFeatures' | 'spaceId' | 'uiSettingsClient'
>;
const getAnomalyDataFromApi = async ({
  entities,
  esClient,
  fromDate,
  logger,
  ml,
  soClient,
  toDate,
}: GetAnomalyDataFromApiOpts): Promise<AnomalyRecord[][]> => {
  if (!ml) {
    return entities.map(() => []);
  }

  const { jobMetaById } = await getSecurityJobIds(ml, soClient);

  return Promise.all(
    entities.map(async ({ entity }) => {
      const entityIdentifier = entity?.id;
      const entityType = entity?.EngineMetadata?.Type as EntityType | undefined;
      if (!entityIdentifier || !entityType) {
        return [];
      }

      const anomaliesWithBaseline = await getEntityAnomalies({
        entityId: entityIdentifier,
        entityType,
        esClient,
        logger,
        fromMs: fromDate,
        ml,
        toMs: toDate,
        soClient,
      });

      return anomaliesWithBaseline.anomalies.map((anomaly) => ({
        source: anomaly,
        job: jobMetaById[anomaly.jobId],
      }));
    })
  );
};

type GetAnomalyDataFromMlOpts = Omit<
  GetAnomalyDataOptions,
  'esClient' | 'experimentalFeatures' | 'logger' | 'spaceId'
>;
const getAnomalyDataFromMl = async ({
  entities,
  fromDate,
  ml,
  soClient,
  toDate,
  uiSettingsClient,
}: GetAnomalyDataFromMlOpts) => {
  if (!ml) {
    return entities.map(() => []);
  }

  const { securityJobIds, jobMetaById } = await getSecurityJobIds(ml, soClient);
  const request = {} as KibanaRequest;
  const { getAnomaliesTableData } = ml.resultsServiceProvider(request, soClient);
  const anomalyScore = await uiSettingsClient.get<number>(DEFAULT_ANOMALY_SCORE);

  return Promise.all(
    entities.map(async (entity) => {
      const entityIdentifier = entity?.entity?.id;
      const entityType = entity?.entity?.EngineMetadata?.Type as EntityType | undefined;
      if (!entityIdentifier || !entityType) {
        return [];
      }

      const euidEntityFilter = euid.dsl.getEuidFilterBasedOnDocument(entityType, entity);
      if (!euidEntityFilter) {
        return [];
      }

      const anomaliesData = await getAnomaliesTableData(
        securityJobIds,
        [],
        [],
        'auto',
        [{ min: getThreshold(anomalyScore, -1) }],
        fromDate,
        toDate,
        Intl.DateTimeFormat().resolvedOptions().timeZone,
        500,
        10,
        { bool: { filter: [euidEntityFilter] } }
      );

      return anomaliesData.anomalies.map((anomaly) => ({
        source: anomaly.source,
        job: jobMetaById[anomaly.jobId],
      }));
    })
  );
};

export const getAnomalyData = async ({
  entities,
  esClient,
  experimentalFeatures,
  fromDate,
  toDate,
  logger,
  ml,
  soClient,
  uiSettingsClient,
}: GetAnomalyDataOptions): Promise<AnomalyRecord[][]> => {
  if (entities.length === 0) {
    return [];
  }

  return experimentalFeatures.entityAnalyticsAnomalyDetails
    ? getAnomalyDataFromApi({
        entities,
        esClient,
        fromDate,
        logger,
        ml,
        soClient,
        toDate,
      })
    : getAnomalyDataFromMl({
        entities,
        fromDate,
        ml,
        soClient,
        toDate,
        uiSettingsClient,
      });
};
