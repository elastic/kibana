/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

import { formatRelativeUpdatedAt } from '../helpers/format_relative_updated_at';
import * as i18n from '../translations';

export interface RelativeUpdatedAtProps {
  updatedAt: string;
}

/**
 * Compact last-updated indicator (`now` / `1m` / `1h` / `1d`) for a conversation row.
 */
export const RelativeUpdatedAt: React.FC<RelativeUpdatedAtProps> = ({ updatedAt }) => {
  const { euiTheme } = useEuiTheme();
  const label = formatRelativeUpdatedAt({ updatedAt });

  if (label == null) {
    return null;
  }

  return (
    <time
      aria-label={i18n.lastUpdatedAriaLabel(label)}
      css={css`
        color: ${euiTheme.colors.textSubdued};
        flex-shrink: 0;
        font-size: 12px;
        line-height: 16px;
        margin: 0;
        white-space: nowrap;
      `}
      data-test-subj="pndQueueRelativeUpdatedAt"
      dateTime={updatedAt}
    >
      {label}
    </time>
  );
};
