/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

/**
 * Header component for the ES|QL Inventory page.
 * Displays the title and prototype badge.
 */
export const InventoryHeader: React.FC = () => (
  <EuiFlexGroup alignItems="center" gutterSize="s">
    <EuiFlexItem grow={false}>
      <EuiTitle size="m">
        <h1>
          {i18n.translate('xpack.infra.esqlInventory.title', {
            defaultMessage: 'ES|QL Inventory',
          })}
        </h1>
      </EuiTitle>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiBadge color="warning">
        {i18n.translate('xpack.infra.esqlInventoryGrid.prototypeBadgeLabel', {
          defaultMessage: 'Prototype',
        })}
      </EuiBadge>
    </EuiFlexItem>
  </EuiFlexGroup>
);
