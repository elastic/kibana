/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationFn } from '@kbn/core/server';
import type { InfraSourceConfiguration } from '../../../../common/source_configuration/source_configuration';

type SevenTwelveZeroSourceConfig = Omit<InfraSourceConfiguration, 'logIndices'> & {
  logAlias: string;
};

const LOGS_INDEX_PATTERN = 'logs-*,filebeat-*,kibana_sample_data_logs*';

export const convertLogAliasToLogIndices: SavedObjectMigrationFn<
  SevenTwelveZeroSourceConfig,
  InfraSourceConfiguration
> = (sourceConfigurationDocument) => {
  const { logAlias, ...otherAttributes } = sourceConfigurationDocument.attributes;

  const newAttributes: InfraSourceConfiguration = {
    ...otherAttributes,
    logIndices: {
      type: 'index_name',
      indexName: logAlias ?? LOGS_INDEX_PATTERN,
    },
  };

  return {
    ...sourceConfigurationDocument,
    attributes: newAttributes,
  };
};
