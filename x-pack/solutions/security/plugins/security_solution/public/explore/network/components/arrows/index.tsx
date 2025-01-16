/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

/** Renders the body (non-pointy part) of an arrow */
export const ArrowBody = React.memo<{
  height: number;
}>(({ height }) => {
  const { euiTheme } = useEuiTheme();
  const styles = css`
    background-color: ${euiTheme.colors.lightShade};
    height: ${height}px;
    width: 25px;
  `;

  return <span css={styles} />;
});

ArrowBody.displayName = 'ArrowBody';

export type ArrowDirection = 'arrowLeft' | 'arrowRight';

/** Renders the head of an arrow */
export const ArrowHead = React.memo<{
  direction: ArrowDirection;
}>(({ direction }) => (
  <EuiIcon color="subdued" data-test-subj="arrow-icon" size="s" type={direction} />
));

ArrowHead.displayName = 'ArrowHead';
