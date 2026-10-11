/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import { EuiLink } from '@elastic/eui';
import type { Row } from '../../common';
import { DefaultCell } from './default_cell';

const cellTruncateCss = css`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
`;

export const GroupSizeCell = memo(
  ({
    value,
    row,
    onGroupSizeClick,
  }: {
    value: unknown;
    row: Row;
    onGroupSizeClick?: (row: Row) => void;
  }) =>
    onGroupSizeClick ? (
      <div
        css={css`
          display: flex;
          overflow: hidden;
        `}
      >
        <EuiLink onClick={() => onGroupSizeClick(row)} css={cellTruncateCss}>
          {String(value ?? '—')}
        </EuiLink>
      </div>
    ) : (
      <DefaultCell value={value} />
    )
);
GroupSizeCell.displayName = 'GroupSizeCell';
