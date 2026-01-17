/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem } from '@elastic/eui';
import React, { memo } from 'react';
import { css } from '@emotion/react';

export const MAIN_SECTION_TEST_ID = 'mainSection';

interface MainSectionProps {
  /**
   * Component to be rendered
   */
  component: React.ReactElement;
}

/**
 * Main section of the flyout rendering a panel
 */
export const MainSection: React.FC<MainSectionProps> = memo(({ component }: MainSectionProps) => (
  <EuiFlexItem
    grow={false}
    css={css`
      height: calc(100% - 42px);
    `}
    data-test-subj={MAIN_SECTION_TEST_ID}
  >
    {component}
  </EuiFlexItem>
));

MainSection.displayName = 'MainSection';
