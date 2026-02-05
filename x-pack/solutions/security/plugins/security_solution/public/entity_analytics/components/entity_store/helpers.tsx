/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { IconType } from '@elastic/eui';
import { EntityType } from '../../../../common/entity_analytics/types';

import {
  ASSET_CRITICALITY_INDEX_PATTERN,
  RISK_SCORE_INDEX_PATTERN,
} from '../../../../common/constants';
import type { Entity } from '../../../../common/api/entity_analytics/entity_store/entities/common.gen';

/** Keys used when entity fields are flattened at top level (e.g. from ES/search API) */
const FLAT_ENTITY_TYPE_KEY = 'entity.type';
const FLAT_ENTITY_ENGINE_TYPE_KEY = 'entity.EngineMetadata.Type';

export const getEntityType = (record: Entity): EntityType => {
  // Prefer nested form, then flattened top-level keys (e.g. entity store / search results)
  const recordAny = record as Record<string, unknown>;
  const entityType =
    record.entity?.EngineMetadata?.Type ??
    record.entity?.type ??
    recordAny[FLAT_ENTITY_ENGINE_TYPE_KEY] ??
    recordAny[FLAT_ENTITY_TYPE_KEY];

  console.log('entityType', entityType);
  if (!entityType || !Object.values(EntityType).includes(entityType as EntityType)) {
    throw new Error(`Unexpected entity: ${JSON.stringify(record)}`);
  }

  return EntityType[entityType as keyof typeof EntityType];
};

export const EntityIconByType: Record<EntityType, IconType> = {
  [EntityType.user]: 'user',
  [EntityType.host]: 'storage',
  [EntityType.service]: 'node',
  [EntityType.generic]: 'globe',
};

export const sourceFieldToText = (source: string) => {
  if (source.match(`^${RISK_SCORE_INDEX_PATTERN}`)) {
    return (
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.entityStore.helpers.sourceField.riskDescription"
        defaultMessage="Risk"
      />
    );
  }

  if (source.match(`^${ASSET_CRITICALITY_INDEX_PATTERN}`)) {
    return (
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.entityStore.helpers.sourceField.criticalityDescription"
        defaultMessage="Asset Criticality"
      />
    );
  }

  return (
    <FormattedMessage
      id="xpack.securitySolution.entityAnalytics.entityStore.helpers.sourceField.eventDescription"
      defaultMessage="Events"
    />
  );
};
