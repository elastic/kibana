/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { HEADER_ACTIONS_TEST_ID } from './test_ids';

export interface FlyoutNavigationProps {
  /**
   * Optional actions to be placed on the right hand side of navigation
   */
  actions?: React.ReactElement;
  /**
   * Boolean indicating the panel is shown in preview panel
   */
  isPreviewMode?: boolean;
}

/**
 * Navigation menu on the right panel only, with expand/collapse button and option to
 * pass in a list of actions to be displayed on top.
 */
export const FlyoutNavigation: FC<FlyoutNavigationProps> = memo(({ actions, isPreviewMode }) => {
  const { euiTheme } = useEuiTheme();

  // do not show navigation in preview mode
  if (isPreviewMode) {
    return null;
  }

  return actions ? (
    <EuiFlexGroup
      direction="row"
      justifyContent="spaceBetween"
      alignItems="center"
      gutterSize="none"
      responsive={false}
      css={css`
        padding-left: ${euiTheme.size.s};
        padding-right: ${euiTheme.size.xxxxl};
        height: ${euiTheme.size.xxl};
      `}
    >
      {actions && (
        <EuiFlexItem grow={false} data-test-subj={HEADER_ACTIONS_TEST_ID}>
          {actions}
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  ) : null;
});

FlyoutNavigation.displayName = 'FlyoutNavigation';
