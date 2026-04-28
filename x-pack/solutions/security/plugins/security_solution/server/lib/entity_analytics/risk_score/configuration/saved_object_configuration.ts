/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  Logger,
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsFindResult,
} from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import { getAlertsIndex } from '../../../../../common/entity_analytics/utils';
import type { RiskScoreConfiguration } from '../../types';
import { riskEngineConfigurationTypeName } from '../saved_object';

export interface SavedObjectsClientArg {
  savedObjectsClient: SavedObjectsClientContract;
  logger?: Logger;
}

export const getRiskEngineConfigurationSavedObjectId = ({ namespace }: { namespace: string }) =>
  `${riskEngineConfigurationTypeName}-${namespace}`;

export const getDefaultRiskEngineConfiguration = ({
  namespace,
}: {
  namespace: string;
}): RiskScoreConfiguration => ({
  dataViewId: getAlertsIndex(namespace),
  enabled: false,
  filter: {},
  identifierType: undefined,
  interval: '1h',
  pageSize: 10_000,
  range: { start: 'now-30d', end: 'now' },
  enableResetToZero: true,
  excludeAlertStatuses: ['closed'],
  _meta: {
    // Upgrade this property when changing mappings
    mappingsVersion: 8,
  },
});

const getConfigurationSavedObjectById = async ({
  savedObjectsClient,
  namespace,
}: SavedObjectsClientArg & {
  namespace: string;
}): Promise<SavedObject<RiskScoreConfiguration> | undefined> => {
  try {
    return await savedObjectsClient.get<RiskScoreConfiguration>(
      riskEngineConfigurationTypeName,
      getRiskEngineConfigurationSavedObjectId({ namespace })
    );
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return undefined;
    }
    throw error;
  }
};

const findLegacyConfigurationSavedObjects = async ({
  savedObjectsClient,
  namespace,
}: SavedObjectsClientArg & {
  namespace: string;
}): Promise<Array<SavedObject<RiskScoreConfiguration>>> => {
  const savedObjectsResponse = await savedObjectsClient.find<RiskScoreConfiguration>({
    type: riskEngineConfigurationTypeName,
    perPage: 100,
  });
  return savedObjectsResponse.saved_objects.filter(
    ({ id }) => id !== getRiskEngineConfigurationSavedObjectId({ namespace })
  );
};

const createConfigurationSavedObject = async ({
  savedObjectsClient,
  namespace,
  attributes,
}: SavedObjectsClientArg & {
  namespace: string;
  attributes: RiskScoreConfiguration;
}): Promise<SavedObject<RiskScoreConfiguration>> => {
  try {
    return await savedObjectsClient.create<RiskScoreConfiguration>(
      riskEngineConfigurationTypeName,
      attributes,
      {
        id: getRiskEngineConfigurationSavedObjectId({ namespace }),
      }
    );
  } catch (error) {
    if (SavedObjectsErrorHelpers.isConflictError(error)) {
      return savedObjectsClient.get<RiskScoreConfiguration>(
        riskEngineConfigurationTypeName,
        getRiskEngineConfigurationSavedObjectId({ namespace })
      );
    }
    throw error;
  }
};

const chooseLegacyConfigurationSavedObject = ({
  legacyConfigurations,
  logger,
  namespace,
}: {
  legacyConfigurations: Array<SavedObject<RiskScoreConfiguration>>;
  logger?: Logger;
  namespace: string;
}): SavedObject<RiskScoreConfiguration> => {
  const sortedConfigurations = [...legacyConfigurations].sort((a, b) => {
    const updatedAtCompare = String(b.updated_at ?? '').localeCompare(String(a.updated_at ?? ''));
    if (updatedAtCompare !== 0) {
      return updatedAtCompare;
    }

    return a.id.localeCompare(b.id);
  });

  const chosenConfiguration = sortedConfigurations[0];

  if (sortedConfigurations.length > 1) {
    logger?.warn(
      `Found ${sortedConfigurations.length} legacy ${riskEngineConfigurationTypeName} saved objects in namespace "${namespace}". ` +
        `Using "${chosenConfiguration.id}" and preserving the most recently updated config.`
    );
  }

  return chosenConfiguration;
};

const deleteSavedObjectSafe = async (
  savedObjectsClient: SavedObjectsClientContract,
  id: string
): Promise<void> => {
  try {
    await savedObjectsClient.delete(riskEngineConfigurationTypeName, id, {
      refresh: 'wait_for',
    });
  } catch (error) {
    if (!SavedObjectsErrorHelpers.isNotFoundError(error)) {
      throw error;
    }
  }
};

const adoptLegacyConfigurationSavedObject = async ({
  savedObjectsClient,
  namespace,
  chosenConfiguration,
  allLegacyConfigurations,
}: SavedObjectsClientArg & {
  namespace: string;
  chosenConfiguration: SavedObject<RiskScoreConfiguration>;
  allLegacyConfigurations: Array<SavedObject<RiskScoreConfiguration>>;
}): Promise<SavedObject<RiskScoreConfiguration>> => {
  const adoptedConfiguration = await createConfigurationSavedObject({
    savedObjectsClient,
    namespace,
    attributes: { ...chosenConfiguration.attributes, pageSize: 10_000 },
  });

  for (const legacy of allLegacyConfigurations) {
    await deleteSavedObjectSafe(savedObjectsClient, legacy.id);
  }

  return adoptedConfiguration;
};

const getConfigurationSavedObject = async ({
  savedObjectsClient,
  logger,
  namespace,
}: SavedObjectsClientArg & {
  namespace: string;
}): Promise<SavedObject<RiskScoreConfiguration> | undefined> => {
  const configuration = await getConfigurationSavedObjectById({ savedObjectsClient, namespace });
  if (configuration) {
    return configuration;
  }

  const legacyConfigurations = await findLegacyConfigurationSavedObjects({
    savedObjectsClient,
    namespace,
  });
  if (legacyConfigurations.length === 0) {
    return undefined;
  }

  return adoptLegacyConfigurationSavedObject({
    savedObjectsClient,
    namespace,
    chosenConfiguration: chooseLegacyConfigurationSavedObject({
      legacyConfigurations,
      logger,
      namespace,
    }),
    allLegacyConfigurations: legacyConfigurations,
  });
};

export const updateSavedObjectAttribute = async ({
  savedObjectsClient,
  logger,
  namespace,
  attributes,
}: SavedObjectsClientArg & {
  namespace: string;
  attributes: Partial<RiskScoreConfiguration>;
}) => {
  const savedObjectConfiguration = await getConfigurationSavedObject({
    savedObjectsClient,
    logger,
    namespace,
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
  logger,
}: SavedObjectsClientArg & { namespace: string }) => {
  const configuration = await getConfigurationSavedObject({
    savedObjectsClient,
    logger,
    namespace,
  });
  if (configuration) {
    return configuration;
  }
  return createConfigurationSavedObject({
    savedObjectsClient,
    namespace,
    attributes: getDefaultRiskEngineConfiguration({ namespace }),
  });
};

export const deleteSavedObjects = async ({
  savedObjectsClient,
  namespace,
}: SavedObjectsClientArg & {
  namespace: string;
}): Promise<void> => {
  const configurationById = await getConfigurationSavedObjectById({
    savedObjectsClient,
    namespace,
  });
  const legacyConfigurations = await findLegacyConfigurationSavedObjects({
    savedObjectsClient,
    namespace,
  });

  const allToDelete = [...(configurationById ? [configurationById] : []), ...legacyConfigurations];

  for (const config of allToDelete) {
    await deleteSavedObjectSafe(savedObjectsClient, config.id);
  }
};

export const getConfiguration = async ({
  savedObjectsClient,
  logger,
  namespace,
}: SavedObjectsClientArg & {
  namespace: string;
}): Promise<RiskScoreConfiguration | null> => {
  try {
    const savedObjectConfiguration = await getConfigurationSavedObject({
      savedObjectsClient,
      logger,
      namespace,
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
}: SavedObjectsClientArg): Promise<Array<SavedObjectsFindResult<RiskScoreConfiguration>>> => {
  const savedObjectsResponse = await savedObjectsClient.find<RiskScoreConfiguration>({
    type: riskEngineConfigurationTypeName,
    namespaces: ['*'],
  });

  return savedObjectsResponse.saved_objects;
};
