/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';

import { AndOrBadge } from '../and_or_badge';

const myInvisibleAndBadgeStyles = css`
  visibility: hidden;
`;

const myFirstRowContainerStyles = css`
  padding-top: 20px;
`;

interface BuilderAndBadgeProps {
  entriesLength: number;
  exceptionItemIndex: number;
}

export const BuilderAndBadgeComponent = React.memo<BuilderAndBadgeProps>(
  ({ entriesLength, exceptionItemIndex }) => {
    const badge = <AndOrBadge includeAntennas type="and" />;

    if (entriesLength > 1 && exceptionItemIndex === 0) {
      return (
        <EuiFlexItem
          css={myFirstRowContainerStyles}
          grow={false}
          data-test-subj="exceptionItemEntryFirstRowAndBadge"
        >
          {badge}
        </EuiFlexItem>
      );
    } else if (entriesLength <= 1) {
      return (
        <EuiFlexItem
          css={myInvisibleAndBadgeStyles}
          grow={false}
          data-test-subj="exceptionItemEntryInvisibleAndBadge"
        >
          {badge}
        </EuiFlexItem>
      );
    } else {
      return (
        <EuiFlexItem grow={false} data-test-subj="exceptionItemEntryAndBadge">
          {badge}
        </EuiFlexItem>
      );
    }
  }
);

BuilderAndBadgeComponent.displayName = 'BuilderAndBadge';
