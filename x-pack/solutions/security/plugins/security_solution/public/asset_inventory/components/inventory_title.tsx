/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const InventoryTitle = () => {
  return (
    <EuiTitle size="l" data-test-subj="inventory-title">
      <h1>
        <FormattedMessage
          id="xpack.securitySolution.assetInventory.inventoryTitle"
          defaultMessage="Inventory"
        />
      </h1>
    </EuiTitle>
  );
};
