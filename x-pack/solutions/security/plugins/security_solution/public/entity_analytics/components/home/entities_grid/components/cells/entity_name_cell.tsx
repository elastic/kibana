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
import { ellipsisCss } from './styles';

const nameCellCss = css`
  overflow: hidden;
  min-width: 0;
  width: 100%;
`;

const nameLinkCss = css`
  display: block;
  width: 100%;
  min-width: 0;
`;

/**
 * Truncates with CSS. EuiTextTruncate measures each cell after render, which costs a
 * commit per cell; CSS ellipsis also keeps the full name readable by screen readers.
 */
export const EntityNameCell = memo(
  ({
    value,
    row,
    onEntityNameClick,
  }: {
    value: unknown;
    row: Row;
    onEntityNameClick?: (row: Row) => void;
  }) => {
    const name = String(value ?? '—');
    const text = (
      <span css={ellipsisCss} title={name}>
        {name}
      </span>
    );
    return (
      <div css={nameCellCss}>
        {onEntityNameClick ? (
          <EuiLink onClick={() => onEntityNameClick(row)} css={[nameLinkCss, ellipsisCss]}>
            {text}
          </EuiLink>
        ) : (
          <div css={ellipsisCss}>{text}</div>
        )}
      </div>
    );
  }
);
EntityNameCell.displayName = 'EntityNameCell';
