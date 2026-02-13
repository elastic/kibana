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
import { generateHostEntityIdScript } from '../painless/generate_host_entity_id_script';
import { generateUserEntityIdScript } from '../painless/generate_user_entity_id_script';

export const convertToEntityManagerDefinition = (
  description: EntityEngineInstallationDescriptor,
  options: { namespace: string; filter: string }
): EntityDefinition => {
  const metadata = description.fields.map(pick(['source', 'destination', 'aggregation']));

  // Generate runtime mappings for entity ID computation (for user and host entities)
  let runtimeMappings;
  if (description.entityType === 'host') {
    runtimeMappings = {
      _computed_entity_id: {
        type: 'keyword',
        script: {
          source: generateHostEntityIdScript(),
        },
      },
    };
  } else if (description.entityType === 'user') {
    runtimeMappings = {
      _computed_entity_id: {
        type: 'keyword',
        script: {
          source: generateUserEntityIdScript(),
        },
      },
    };
  }

  // Mark runtime-computed identity fields as optional to skip the exists filter in transforms
  const identityFields =
    description.entityType === 'host' || description.entityType === 'user'
      ? [{ field: description.identityField, optional: true }]
      : [description.identityField];

  // Set display name template to use the original name field, not the computed ID
  let displayNameTemplate = `{{${description.identityField}}}`;
  if (description.entityType === 'host') {
    displayNameTemplate = '{{host.name}}';
  } else if (description.entityType === 'user') {
    displayNameTemplate = '{{user.name}}';
  }

  const definition = {
    id: buildEntityDefinitionId(description.entityType, options.namespace),
    name: `Security '${description.entityType}' Entity Store Definition`,
    type: description.entityType,
    indexPatterns: description.indexPatterns,
    identityFields,
    displayNameTemplate,
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
        maxPageSearchSize: description.settings.maxPageSearchSize,
      },
    },
    version: description.version,
    managed: true,
    capabilities: description.capabilities,
    ...(runtimeMappings ? { runtimeMappings } : {}),
  };

  return entityDefinitionSchema.parse(definition);
};
