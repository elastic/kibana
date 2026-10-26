/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import {
  ALERT_HOST_CRITICALITY,
  ALERT_SERVICE_CRITICALITY,
  ALERT_USER_CRITICALITY,
} from '../../../../../../../common/field_maps/field_names';
import { createSingleFieldMatchEnrichment } from '../create_single_field_match_enrichment';
import { createEntityStoreEnrichment } from '../create_entity_store_risk_enrichment';
import type {
  CreateCriticalityEnrichment,
  CreateEnrichmentFunction,
  CreateV2EnrichmentFunction,
} from '../types';
import { getFieldValue } from '../utils/events';
import { getAssetCriticalityIndex } from '../../../../../../../common/entity_analytics/asset_criticality';

const ENTITY_ASSET_CRITICALITY_FIELD = 'asset.criticality';

const createV2CriticalityEnrichmentFunction =
  (
    alertField:
      | typeof ALERT_HOST_CRITICALITY
      | typeof ALERT_USER_CRITICALITY
      | typeof ALERT_SERVICE_CRITICALITY
  ): CreateV2EnrichmentFunction =>
  (fields) =>
  (event) => {
    const criticality = fields[ENTITY_ASSET_CRITICALITY_FIELD]?.[0] as string | undefined;
    if (!criticality) {
      return event;
    }
    const newEvent = cloneDeep(event);
    if (newEvent._source) {
      newEvent._source[alertField] = criticality;
    }
    return newEvent;
  };

export const createV2HostAssetCriticalityEnrichments: CreateCriticalityEnrichment = async ({
  entityStoreCrudClient,
  logger,
  events,
}) => {
  if (!entityStoreCrudClient) return {};
  return createEntityStoreEnrichment({
    name: 'Host Asset Criticality',
    entityType: 'host',
    entityStoreCrudClient,
    logger,
    events,
    enrichmentFields: [ENTITY_ASSET_CRITICALITY_FIELD],
    createEnrichmentFunction: createV2CriticalityEnrichmentFunction(ALERT_HOST_CRITICALITY),
  });
};

export const createV2UserAssetCriticalityEnrichments: CreateCriticalityEnrichment = async ({
  entityStoreCrudClient,
  logger,
  events,
}) => {
  if (!entityStoreCrudClient) return {};
  return createEntityStoreEnrichment({
    name: 'User Asset Criticality',
    entityType: 'user',
    entityStoreCrudClient,
    logger,
    events,
    enrichmentFields: [ENTITY_ASSET_CRITICALITY_FIELD],
    createEnrichmentFunction: createV2CriticalityEnrichmentFunction(ALERT_USER_CRITICALITY),
  });
};

export const createV2ServiceAssetCriticalityEnrichments: CreateCriticalityEnrichment = async ({
  entityStoreCrudClient,
  logger,
  events,
}) => {
  if (!entityStoreCrudClient) return {};
  return createEntityStoreEnrichment({
    name: 'Service Asset Criticality',
    entityType: 'service',
    entityStoreCrudClient,
    logger,
    events,
    enrichmentFields: [ENTITY_ASSET_CRITICALITY_FIELD],
    createEnrichmentFunction: createV2CriticalityEnrichmentFunction(ALERT_SERVICE_CRITICALITY),
  });
};

const enrichmentResponseFields = ['id_value', 'criticality_level'];
const getExtraFiltersForEnrichment = (field: string) => [
  {
    match: {
      id_field: {
        query: field,
      },
    },
  },
];

const createEnrichmentFactoryFunction =
  (
    alertField:
      | typeof ALERT_HOST_CRITICALITY
      | typeof ALERT_USER_CRITICALITY
      | typeof ALERT_SERVICE_CRITICALITY
  ): CreateEnrichmentFunction =>
  (enrichment) =>
  (event) => {
    const criticality = getFieldValue(enrichment, 'criticality_level');

    if (!criticality) {
      return event;
    }
    const newEvent = cloneDeep(event);
    if (criticality && newEvent._source) {
      newEvent._source[alertField] = criticality;
    }
    return newEvent;
  };

export const createHostAssetCriticalityEnrichments: CreateCriticalityEnrichment = async ({
  services,
  logger,
  events,
  spaceId,
}) => {
  return createSingleFieldMatchEnrichment({
    name: 'Host Asset Criticality',
    index: [getAssetCriticalityIndex(spaceId)],
    services,
    logger,
    events,
    mappingField: {
      eventField: 'host.name',
      enrichmentField: 'id_value',
    },
    enrichmentResponseFields,
    extraFilters: getExtraFiltersForEnrichment('host.name'),
    createEnrichmentFunction: createEnrichmentFactoryFunction(ALERT_HOST_CRITICALITY),
  });
};

export const createUserAssetCriticalityEnrichments: CreateCriticalityEnrichment = async ({
  services,
  logger,
  events,
  spaceId,
}) => {
  return createSingleFieldMatchEnrichment({
    name: 'User Asset Criticality',
    index: [getAssetCriticalityIndex(spaceId)],
    services,
    logger,
    events,
    mappingField: {
      eventField: 'user.name',
      enrichmentField: 'id_value',
    },
    enrichmentResponseFields,
    extraFilters: getExtraFiltersForEnrichment('user.name'),
    createEnrichmentFunction: createEnrichmentFactoryFunction(ALERT_USER_CRITICALITY),
  });
};

export const createServiceAssetCriticalityEnrichments: CreateCriticalityEnrichment = async ({
  services,
  logger,
  events,
  spaceId,
}) => {
  return createSingleFieldMatchEnrichment({
    name: 'Service Asset Criticality',
    index: [getAssetCriticalityIndex(spaceId)],
    services,
    logger,
    events,
    mappingField: {
      eventField: 'service.name',
      enrichmentField: 'id_value',
    },
    enrichmentResponseFields,
    extraFilters: getExtraFiltersForEnrichment('service.name'),
    createEnrichmentFunction: createEnrichmentFactoryFunction(ALERT_SERVICE_CRITICALITY),
  });
};
