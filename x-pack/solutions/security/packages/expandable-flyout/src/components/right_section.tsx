/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem } from '@elastic/eui';
import React, { memo } from 'react';
import { RIGHT_SECTION_TEST_ID } from './test_ids';

const styles = { height: '100%' };

interface RightSectionProps {
  /**
   * Component to be rendered
   */
  component: React.ReactElement;
}

/**
 * Right section of the expanded flyout rendering a panel
 */
export const RightSection: React.FC<RightSectionProps> = memo(
  ({ component }: RightSectionProps) => (
    <EuiFlexItem grow={false} css={styles} data-test-subj={RIGHT_SECTION_TEST_ID}>
      {component}
    </EuiFlexItem>
  )
);

RightSection.displayName = 'RightSection';
