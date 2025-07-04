/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { capitalize } from 'lodash/fp';
import type { EntityType } from '../../../common/search_strategy';

const RiskScoreHeaderTitleComponent = ({
  riskScoreEntity,
  title,
}: {
  riskScoreEntity: EntityType;
  title?: string;
}) => (
  <>
    {title ?? (
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.usersRiskDashboard.title"
        defaultMessage="{entityType} Risk Scores"
        values={{
          entityType: capitalize(riskScoreEntity),
        }}
      />
    )}
  </>
);

export const RiskScoreHeaderTitle = React.memo(RiskScoreHeaderTitleComponent);
RiskScoreHeaderTitle.displayName = 'RiskScoreHeaderTitle';
