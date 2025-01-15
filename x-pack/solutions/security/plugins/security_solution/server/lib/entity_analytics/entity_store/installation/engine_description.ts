/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { pipe } from 'fp-ts/lib/function';

import { assign, concat, map, merge, update } from 'lodash/fp';
import { set } from '@kbn/safer-lodash-set/fp';

import type { EntityType } from '../../../../../common/api/entity_analytics';
import {
  DEFAULT_FIELD_HISTORY_LENGTH,
  DEFAULT_LOOKBACK_PERIOD,
  DEFAULT_TIMESTAMP_FIELD,
} from '../entity_definitions/constants';
import { generateIndexMappings } from '../elasticsearch_assets';
import {
  hostEntityEngineDescription,
  userEntityEngineDescription,
  universalEntityEngineDescription,
  serviceEntityEngineDescription,
} from '../entity_definitions/entity_descriptions';

import type { EntityStoreConfig } from '../types';
import { buildEntityDefinitionId } from '../utils';
import type { EntityDescription } from '../entity_definitions/types';
import type { EntityEngineInstallationDescriptor } from './types';

const engineDescriptionRegistry: Record<EntityType, EntityDescription> = {
  host: hostEntityEngineDescription,
  user: userEntityEngineDescription,
  universal: universalEntityEngineDescription,
  service: serviceEntityEngineDescription,
};

interface EngineDescriptionParams {
  entityType: EntityType;
  namespace: string;
  config: EntityStoreConfig;
  requestParams?: {
    indexPattern?: string;
    fieldHistoryLength?: number;
  };
  defaultIndexPatterns: string[];
}

export const createEngineDescription = (options: EngineDescriptionParams) => {
  const { entityType, namespace, config, requestParams, defaultIndexPatterns } = options;
  const fieldHistoryLength = requestParams?.fieldHistoryLength || DEFAULT_FIELD_HISTORY_LENGTH;

  const indexPatterns = requestParams?.indexPattern
    ? defaultIndexPatterns.concat(requestParams?.indexPattern.split(','))
    : defaultIndexPatterns;

  const description = engineDescriptionRegistry[entityType];

  const settings: EntityEngineInstallationDescriptor['settings'] = {
    syncDelay: `${config.syncDelay.asSeconds()}s`,
    frequency: `${config.frequency.asSeconds()}s`,
    lookbackPeriod: description.settings?.lookbackPeriod || DEFAULT_LOOKBACK_PERIOD,
    timestampField: description.settings?.timestampField || DEFAULT_TIMESTAMP_FIELD,
  };

  const updatedDescription = pipe(
    description,
    set('id', buildEntityDefinitionId(entityType, namespace)),
    update('settings', assign(settings)),
    updateIndexPatterns(indexPatterns),
    updateRetentionFields(fieldHistoryLength),
    addIndexMappings
  ) as EntityEngineInstallationDescriptor;

  return updatedDescription;
};

const updateIndexPatterns = (indexPatterns: string[]) =>
  update('indexPatterns', (prev = []) => concat(indexPatterns, prev));

const updateRetentionFields = (fieldHistoryLength: number) =>
  update(
    'fields',
    map(
      merge({
        retention: { maxLength: fieldHistoryLength },
        aggregation: { limit: fieldHistoryLength },
      })
    )
  );

const addIndexMappings = (description: EntityEngineInstallationDescriptor) =>
  set('indexMappings', generateIndexMappings(description), description);
