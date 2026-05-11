/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { Indicator } from '../../../common/threat_intelligence/types/indicator';
import { TakeAction } from './components/take_action';
import { IOC_DETAILS_FOOTER_TEST_ID } from './test_ids';

export interface FooterProps {
  /**
   * The indicator document
   */
  indicator: Indicator;
}

/**
 * Footer content of the IOC details flyout containing the take action button.
 */
export const Footer = memo(({ indicator }: FooterProps) => (
  <EuiFlexGroup justifyContent="flexEnd" data-test-subj={IOC_DETAILS_FOOTER_TEST_ID}>
    <EuiFlexItem grow={false}>
      <TakeAction indicator={indicator} />
    </EuiFlexItem>
  </EuiFlexGroup>
));

Footer.displayName = 'Footer';
