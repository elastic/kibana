/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFlyoutFooter, EuiPanel } from '@elastic/eui';
import { FLYOUT_FOOTER_TEST_ID } from './test_ids';

/**
 * Bottom section of the flyout that contains the take action button
 */
export const PanelFooter = () => (
  <EuiFlyoutFooter data-test-subj={FLYOUT_FOOTER_TEST_ID}>
    <EuiPanel color="transparent">
      <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
        <EuiFlexItem grow={false}>{'Add to case'}</EuiFlexItem>
        <EuiFlexItem grow={false}>{'Ask AI Assistant'}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  </EuiFlyoutFooter>
);

PanelFooter.displayName = 'PanelFooter';
