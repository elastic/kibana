/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

/**
 * Empty state shown when no query is configured.
 * Prompts user to select a dimension and metric.
 */
export const EmptyQueryState: React.FC = () => (
  <EuiPanel
    paddingSize="l"
    css={css`
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    `}
  >
    <EuiText color="subdued" textAlign="center">
      <p>
        {i18n.translate('xpack.infra.esqlInventory.selectMetric', {
          defaultMessage: 'Select a dimension and metric to view the inventory grid',
        })}
      </p>
    </EuiText>
  </EuiPanel>
);
