/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectMigrationFn } from '@kbn/core/server';
import { InfraSourceConfiguration } from '../../../../common/source_configuration/source_configuration';

type SevenNineZeroSourceConfig = Omit<InfraSourceConfiguration, 'logIndices'> & {
  logAlias: string;
};

export const addNewIndexingStrategyIndexNames: SavedObjectMigrationFn<
  SevenNineZeroSourceConfig,
  SevenNineZeroSourceConfig
> = (sourceConfigurationDocument) => {
  const oldLogAliasSegments = sourceConfigurationDocument.attributes.logAlias.split(',');
  const oldMetricAliasSegments = sourceConfigurationDocument.attributes.metricAlias.split(',');

  const newLogAliasSegment = 'logs-*';
  const newMetricAliasSegment = 'metrics-*';

  return {
    ...sourceConfigurationDocument,
    attributes: {
      ...sourceConfigurationDocument.attributes,
      logAlias:
        oldLogAliasSegments.includes('filebeat-*') &&
        !oldLogAliasSegments.includes(newLogAliasSegment)
          ? [...oldLogAliasSegments, newLogAliasSegment].join(',')
          : sourceConfigurationDocument.attributes.logAlias,
      metricAlias:
        oldMetricAliasSegments.includes('metricbeat-*') &&
        !oldMetricAliasSegments.includes(newMetricAliasSegment)
          ? [...oldMetricAliasSegments, newMetricAliasSegment].join(',')
          : sourceConfigurationDocument.attributes.metricAlias,
    },
  };
};
