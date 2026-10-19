/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiCard, EuiTextColor, useEuiTheme } from '@elastic/eui';
import type { CollectionVariant } from '../types';

// Two lines: collection variants often share a prefix that one line truncates to the same string.
const TITLE_LINES = 2;
const DESCRIPTION_LINES = 2;

const clampStyle = (lines: number) => css`
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: ${lines};
  overflow: hidden;
`;

const cardOverrideStyle = css`
  padding: 12px;
`;

export interface VariantRowProps {
  variant: CollectionVariant;
}

export const VariantRow = ({ variant }: VariantRowProps) => {
  const { euiTheme } = useEuiTheme();
  // Clamp the title on its own span so a long name cannot eat the badge.
  const titleRowStyle = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
    inline-size: 100%;
    min-inline-size: 0;
  `;
  const titleTextStyle = css`
    ${clampStyle(TITLE_LINES)}
    min-inline-size: 0;
    flex: 1 1 auto;
  `;
  const badgeStyle = css`
    flex-shrink: 0;
  `;

  return (
    <EuiCard
      css={cardOverrideStyle}
      layout="horizontal"
      titleSize="xs"
      hasBorder
      paddingSize="none"
      icon={variant.icon}
      title={
        <span css={titleRowStyle}>
          <span css={titleTextStyle} data-test-subj="collectionVariantTitle">
            {variant.title}
          </span>
          {variant.badge ? <span css={badgeStyle}>{variant.badge}</span> : null}
        </span>
      }
      description={
        <EuiTextColor color="subdued" css={clampStyle(DESCRIPTION_LINES)}>
          {variant.description}
        </EuiTextColor>
      }
      href={variant.href}
      onClick={variant.onClick}
      data-test-subj={variant['data-test-subj']}
    />
  );
};
