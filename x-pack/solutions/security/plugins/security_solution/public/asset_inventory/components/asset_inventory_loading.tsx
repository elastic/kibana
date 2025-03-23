/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingLogo, EuiSpacer } from '@elastic/eui';
import { InventoryTitle } from './inventory_title';
import { CenteredWrapper } from './onboarding/centered_wrapper';

/**
 * A loading state for the asset inventory page.
 */
export const AssetInventoryLoading = () => (
  <EuiFlexGroup>
    <EuiFlexItem>
      <InventoryTitle />
      <EuiSpacer size="l" />
      <CenteredWrapper>
        <EuiLoadingLogo logo="logoSecurity" size="xl" />
      </CenteredWrapper>
    </EuiFlexItem>
  </EuiFlexGroup>
);
