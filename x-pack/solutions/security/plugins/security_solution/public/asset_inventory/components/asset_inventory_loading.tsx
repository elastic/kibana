/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingLogo, EuiSpacer } from '@elastic/eui';
import { AssetInventoryTitle } from './asset_inventory_title';
import { CenteredWrapper } from './onboarding/centered_wrapper';
import { TEST_SUBJ_LOADING } from '../constants';

/**
 * A loading state for the asset inventory page.
 */
export const AssetInventoryLoading = () => (
  <EuiFlexGroup>
    <EuiFlexItem>
      <AssetInventoryTitle />
      <EuiSpacer size="l" />
      <CenteredWrapper>
        <EuiLoadingLogo logo="logoSecurity" size="xl" data-test-subj={TEST_SUBJ_LOADING} />
      </CenteredWrapper>
    </EuiFlexItem>
  </EuiFlexGroup>
);
