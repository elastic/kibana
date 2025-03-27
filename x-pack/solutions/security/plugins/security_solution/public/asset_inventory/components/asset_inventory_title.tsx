/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { TechnicalPreviewBadge } from './technical_preview_badge';
import { TEST_SUBJ_PAGE_TITLE } from '../constants';

export const AssetInventoryTitle = () => {
  return (
    <EuiTitle size="l" data-test-subj={TEST_SUBJ_PAGE_TITLE}>
      <h1>
        <FormattedMessage
          id="xpack.securitySolution.assetInventory.title"
          defaultMessage="Inventory"
        />
        <TechnicalPreviewBadge />
      </h1>
    </EuiTitle>
  );
};
