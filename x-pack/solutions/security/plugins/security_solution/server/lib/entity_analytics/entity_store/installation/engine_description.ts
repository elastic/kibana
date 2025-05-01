/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assign, concat } from 'lodash/fp';
import type {
  EntityType,
  InitEntityEngineRequestBody,
} from '../../../../../common/api/entity_analytics';
import { generateIndexMappings } from '../elasticsearch_assets';
import {
  hostEntityEngineDescription,
  userEntityEngineDescription,
  serviceEntityEngineDescription,
  genericEntityEngineDescription,
} from '../entity_definitions/entity_descriptions';
import type { EntityStoreConfig } from '../types';
import { buildEntityDefinitionId, mergeEntityStoreIndices } from '../utils';
import type { EntityDescription } from '../entity_definitions/types';
import type { EntityEngineInstallationDescriptor } from './types';
import { merge } from '../../../../../common/utils/objects/merge';
import { defaultOptions } from '../constants';

const engineDescriptionRegistry: Record<EntityType, EntityDescription> = {
  host: hostEntityEngineDescription,
  user: userEntityEngineDescription,
  service: serviceEntityEngineDescription,
  generic: genericEntityEngineDescription,
};

interface EngineDescriptionParams {
  entityType: EntityType;
  namespace: string;
  config: EntityStoreConfig;
  requestParams?: InitEntityEngineRequestBody;
  defaultIndexPatterns: string[];
}

export const createEngineDescription = (params: EngineDescriptionParams) => {
  const { entityType, namespace, config, requestParams = {}, defaultIndexPatterns } = params;

  const fileConfig = {
    delay: `${config.syncDelay.asSeconds()}s`,
    frequency: `${config.frequency.asSeconds()}s`,
  };
  const options = merge(defaultOptions, merge(fileConfig, requestParams));

  const indexPatterns = mergeEntityStoreIndices(defaultIndexPatterns, options.indexPattern);

  const description = engineDescriptionRegistry[entityType];

  const settings: EntityEngineInstallationDescriptor['settings'] = {
    syncDelay: options.delay,
    timeout: options.timeout,
    frequency: options.frequency,
    docsPerSecond: options.docsPerSecond,
    lookbackPeriod: options.lookbackPeriod,
    timestampField: options.timestampField,
    maxPageSearchSize: options.maxPageSearchSize,
  };

  const defaults = {
    ...description,
    id: buildEntityDefinitionId(entityType, namespace),
    settings: assign(settings, description.settings),
    indexPatterns: concat(indexPatterns, (description.indexPatterns || []) as string[]),
    fields: description.fields.map(
      merge({
        retention: { maxLength: options.fieldHistoryLength },
        aggregation: { limit: options.fieldHistoryLength },
      })
    ),
    dynamic: description.dynamic || false,
  };

  const updatedDescription: EntityEngineInstallationDescriptor = {
    ...defaults,
    indexMappings: generateIndexMappings(defaults),
  };

  return updatedDescription;
};
