/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsFindResult,
} from '@kbn/core/server';

import { getAlertsIndex } from '../../../../../common/entity_analytics/utils';
import type { RiskEngineConfiguration } from '../../types';
import { riskEngineConfigurationTypeName } from '../saved_object';

export interface SavedObjectsClientArg {
  savedObjectsClient: SavedObjectsClientContract;
}

export const getDefaultRiskEngineConfiguration = ({
  namespace,
}: {
  namespace: string;
}): RiskEngineConfiguration => ({
  dataViewId: getAlertsIndex(namespace),
  enabled: false,
  filter: {},
  identifierType: undefined,
  interval: '1h',
  pageSize: 3_500,
  range: { start: 'now-30d', end: 'now' },
  enableResetToZero: true,
  excludeAlertStatuses: ['closed'],
  _meta: {
    // Upgrade this property when changing mappings
    mappingsVersion: 6,
  },
});

const getConfigurationSavedObject = async ({
  savedObjectsClient,
}: SavedObjectsClientArg): Promise<SavedObject<RiskEngineConfiguration> | undefined> => {
  const savedObjectsResponse = await savedObjectsClient.find<RiskEngineConfiguration>({
    type: riskEngineConfigurationTypeName,
  });
  return savedObjectsResponse.saved_objects?.[0];
};

export const updateSavedObjectAttribute = async ({
  savedObjectsClient,
  attributes,
}: SavedObjectsClientArg & {
  attributes: Partial<RiskEngineConfiguration>;
}) => {
  const savedObjectConfiguration = await getConfigurationSavedObject({
    savedObjectsClient,
  });

  if (!savedObjectConfiguration) {
    throw new Error('Risk engine configuration not found');
  }

  return savedObjectsClient.update(
    riskEngineConfigurationTypeName,
    savedObjectConfiguration.id,
    {
      ...attributes,
    },
    {
      refresh: 'wait_for',
    }
  );
};

export const initSavedObjects = async ({
  namespace,
  savedObjectsClient,
}: SavedObjectsClientArg & { namespace: string }) => {
  const configuration = await getConfigurationSavedObject({ savedObjectsClient });
  if (configuration) {
    return configuration;
  }
  return savedObjectsClient.create(
    riskEngineConfigurationTypeName,
    getDefaultRiskEngineConfiguration({ namespace }),
    {}
  );
};

export const deleteSavedObjects = async ({
  savedObjectsClient,
}: SavedObjectsClientArg): Promise<void> => {
  const configuration = await getConfigurationSavedObject({ savedObjectsClient });
  if (configuration) {
    await savedObjectsClient.delete(riskEngineConfigurationTypeName, configuration.id);
  }
};

export const getConfiguration = async ({
  savedObjectsClient,
}: SavedObjectsClientArg): Promise<RiskEngineConfiguration | null> => {
  try {
    const savedObjectConfiguration = await getConfigurationSavedObject({
      savedObjectsClient,
    });
    const configuration = savedObjectConfiguration?.attributes;

    if (configuration) {
      return configuration;
    }

    return null;
  } catch (e) {
    return null;
  }
};

export const getAllSpaceConfigurations = async ({
  savedObjectsClient,
}: SavedObjectsClientArg): Promise<Array<SavedObjectsFindResult<RiskEngineConfiguration>>> => {
  const savedObjectsResponse = await savedObjectsClient.find<RiskEngineConfiguration>({
    type: riskEngineConfigurationTypeName,
    namespaces: ['*'],
  });

  return savedObjectsResponse.saved_objects;
};
