/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem } from '@elastic/eui';
import React, { memo } from 'react';
import { css } from '@emotion/react';

export const CHILD_SECTION_TEST_ID = 'childSection';

interface ChildSectionProps {
  /**
   * Component to be rendered
   */
  component: React.ReactElement;
}

/**
 * Child section of the flyout rendering a panel
 */
export const ChildSection: React.FC<ChildSectionProps> = memo(
  ({ component }: ChildSectionProps) => (
    <EuiFlexItem
      grow
      data-test-subj={CHILD_SECTION_TEST_ID}
      css={css`
        height: calc(100% - 42px);
      `}
    >
      {component}
    </EuiFlexItem>
  )
);

ChildSection.displayName = 'ChildSection';
