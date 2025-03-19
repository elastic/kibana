/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash/fp';
import { entityDefinitionSchema, type EntityDefinition } from '@kbn/entities-schema';
import { buildEntityDefinitionId } from '../utils';
import type { EntityEngineInstallationDescriptor } from '../installation/types';

export const convertToEntityManagerDefinition = (
  description: EntityEngineInstallationDescriptor,
  options: { namespace: string; filter: string }
): EntityDefinition => {
  const metadata = description.fields.map(pick(['source', 'destination', 'aggregation']));

  const definition = {
    id: buildEntityDefinitionId(description.entityType, options.namespace),
    name: `Security '${description.entityType}' Entity Store Definition`,
    type: description.entityType,
    indexPatterns: description.indexPatterns,
    identityFields: [description.identityField],
    displayNameTemplate: `{{${description.identityField}}}`,
    filter: options.filter,
    metadata,
    latest: {
      timestampField: description.settings.timestampField,
      lookbackPeriod: description.settings.lookbackPeriod,
      settings: {
        syncField: description.settings.timestampField,
        syncDelay: description.settings.syncDelay,
        frequency: description.settings.frequency,
        timeout: description.settings.timeout,
        docsPerSecond: description.settings.docsPerSecond,
      },
    },
    version: description.version,
    managed: true,
  };

  return entityDefinitionSchema.parse(definition);
};
