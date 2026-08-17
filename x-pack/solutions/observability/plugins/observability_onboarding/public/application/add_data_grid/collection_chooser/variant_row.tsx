/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiCard, EuiTextColor } from '@elastic/eui';
import type { CollectionVariant } from '../types';

const TITLE_LINES = 2;
const DESCRIPTION_LINES = 2;

// Two lines for the title, unlike the grid tiles: variants inside one
// collection are often the same registry title with a different suffix, and a
// single line truncates them all to the same string. Rows are stacked in a
// flyout, so growing one costs nothing in alignment.
const clampStyle = (lines: number) => css`
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: ${lines};
  overflow: hidden;
`;

const rowOverrideStyle = css`
  display: contents;

  .euiCard {
    padding: 12px;
  }

  .euiCard__title {
    ${clampStyle(TITLE_LINES)}
  }
`;

export interface VariantRowProps {
  variant: CollectionVariant;
}

/** One collection method inside the chooser. */
export const VariantRow = ({ variant }: VariantRowProps) => (
  <div css={rowOverrideStyle}>
    <EuiCard
      layout="horizontal"
      titleSize="xs"
      hasBorder
      paddingSize="none"
      icon={variant.icon}
      title={variant.title}
      description={
        <EuiTextColor color="subdued" css={clampStyle(DESCRIPTION_LINES)}>
          {variant.description}
        </EuiTextColor>
      }
      href={variant.href}
      onClick={variant.onClick}
      data-test-subj={variant['data-test-subj']}
    />
  </div>
);
