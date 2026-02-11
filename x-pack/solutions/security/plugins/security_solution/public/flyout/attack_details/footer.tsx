/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFlyoutFooter, EuiPanel } from '@elastic/eui';

export const FLYOUT_FOOTER_TEST_ID = 'attack-details-flyout-footer';

/**
 * Bottom section of the flyout that contains the take action button
 */
export const PanelFooter = () => (
  <EuiFlyoutFooter data-test-subj={FLYOUT_FOOTER_TEST_ID}>
    <EuiPanel color="transparent">
      <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
        <EuiFlexItem grow={false} />
      </EuiFlexGroup>
    </EuiPanel>
  </EuiFlyoutFooter>
);

PanelFooter.displayName = 'PanelFooter';
