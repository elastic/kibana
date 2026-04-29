/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiTitle, EuiFlexGroup } from '@elastic/eui';
import { capitalize } from 'lodash/fp';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EntityType } from '../../../../../../../common/entity_analytics/types';

export const EngineStatusHeader = ({
  entityType,
  actionButton,
}: {
  entityType: EntityType;
  actionButton?: React.ReactNode;
}) => (
  <EuiTitle size="s">
    <h4>
      <EuiFlexGroup direction="row" gutterSize="m" alignItems="baseline" responsive={false}>
        <EuiFlexItem grow={false}>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.entityStore.enginesStatus.title"
            defaultMessage="{type} Store"
            values={{
              type: capitalize(entityType),
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false} direction="row">
          {actionButton}
        </EuiFlexItem>
      </EuiFlexGroup>
    </h4>
  </EuiTitle>
);
