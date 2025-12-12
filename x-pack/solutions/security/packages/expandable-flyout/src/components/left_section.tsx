/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem } from '@elastic/eui';
import React, { memo } from 'react';
import { LEFT_SECTION_TEST_ID } from './test_ids';

const styles = { height: '100%' };

interface LeftSectionProps {
  /**
   * Component to be rendered
   */
  component: React.ReactElement;
}

/**
 * Left section of the expanded flyout rendering a panel
 */
export const LeftSection: React.FC<LeftSectionProps> = memo(({ component }: LeftSectionProps) => (
  <EuiFlexItem grow data-test-subj={LEFT_SECTION_TEST_ID} css={styles}>
    {component}
  </EuiFlexItem>
));

LeftSection.displayName = 'LeftSection';
