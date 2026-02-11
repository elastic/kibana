/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFlyoutFooter, EuiPanel } from '@elastic/eui';
import { PREFIX } from '../shared/test_ids';
import { TakeAction } from './components/take_action';

export const FLYOUT_FOOTER_TEST_ID = `${PREFIX}Footer` as const;

/**
 * Bottom section of the flyout that contains the take action button
 */
export const PanelFooter = memo(() => (
  <EuiFlyoutFooter data-test-subj={FLYOUT_FOOTER_TEST_ID}>
    <EuiPanel color="transparent">
      <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
        <EuiFlexItem grow={false}>
          <TakeAction />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  </EuiFlyoutFooter>
));

PanelFooter.displayName = 'PanelFooter';
