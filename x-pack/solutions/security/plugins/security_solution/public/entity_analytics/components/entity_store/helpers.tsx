/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { IconType } from '@elastic/eui';
import { RiskScoreEntityType } from '../../../../common/entity_analytics/types';

import {
  ASSET_CRITICALITY_INDEX_PATTERN,
  RISK_SCORE_INDEX_PATTERN,
} from '../../../../common/constants';
import type {
  Entity,
  HostEntity,
  UserEntity,
  ServiceEntity,
} from '../../../../common/api/entity_analytics/entity_store/entities/common.gen';

export const getEntityType = (record: Entity): RiskScoreEntityType => {
  if ((record as UserEntity)?.user) {
    return RiskScoreEntityType.user;
  }
  if ((record as HostEntity)?.host) {
    return RiskScoreEntityType.host;
  }

  if ((record as ServiceEntity)?.service) {
    return RiskScoreEntityType.service;
  }
  throw new Error(`Unexpected entity: ${JSON.stringify(record)}`);
};

export const EntityIconByType: Record<RiskScoreEntityType, IconType> = {
  [RiskScoreEntityType.user]: 'user',
  [RiskScoreEntityType.host]: 'storage',
  [RiskScoreEntityType.service]: 'console',
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
