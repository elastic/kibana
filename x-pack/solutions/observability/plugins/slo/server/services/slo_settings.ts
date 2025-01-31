/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { PutSLOSettingsParams, sloSettingsSchema } from '@kbn/slo-schema';
import {
  DEFAULT_STALE_SLO_THRESHOLD_HOURS,
  SUMMARY_DESTINATION_INDEX_PATTERN,
} from '../../common/constants';
import { getListOfSloSummaryIndices } from '../../common/summary_indices';
import { SLOSettings, StoredSLOSettings } from '../domain/models';
import { SO_SLO_SETTINGS_TYPE, sloSettingsObjectId } from '../saved_objects/slo_settings';

export const getSloSettings = async (
  soClient: SavedObjectsClientContract
): Promise<SLOSettings> => {
  try {
    const soObject = await soClient.get<StoredSLOSettings>(
      SO_SLO_SETTINGS_TYPE,
      sloSettingsObjectId(soClient.getCurrentNamespace())
    );
    // set if it's not there
    soObject.attributes.staleThresholdInHours = soObject.attributes.staleThresholdInHours ?? 2;
    return sloSettingsSchema.encode(soObject.attributes);
  } catch (e) {
    if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
      return {
        useAllRemoteClusters: false,
        selectedRemoteClusters: [],
        staleThresholdInHours: DEFAULT_STALE_SLO_THRESHOLD_HOURS,
      };
    }
    throw e;
  }
};

export const storeSloSettings = async (
  soClient: SavedObjectsClientContract,
  params: PutSLOSettingsParams
): Promise<SLOSettings> => {
  const object = await soClient.create<StoredSLOSettings>(
    SO_SLO_SETTINGS_TYPE,
    sloSettingsSchema.encode(params),
    {
      id: sloSettingsObjectId(soClient.getCurrentNamespace()),
      overwrite: true,
    }
  );

  return sloSettingsSchema.encode(object.attributes);
};

export const getListOfSummaryIndices = async (
  esClient: ElasticsearchClient,
  settings: StoredSLOSettings
) => {
  const { useAllRemoteClusters, selectedRemoteClusters } = settings;
  if (!useAllRemoteClusters && selectedRemoteClusters.length === 0) {
    return { indices: [SUMMARY_DESTINATION_INDEX_PATTERN], settings };
  }

  const clustersByName = await esClient.cluster.remoteInfo();
  const clusterNames = (clustersByName && Object.keys(clustersByName)) || [];
  const clusterInfo = clusterNames.map((clusterName) => ({
    name: clusterName,
    isConnected: clustersByName[clusterName].connected,
  }));

  return { indices: getListOfSloSummaryIndices(settings, clusterInfo) };
};
