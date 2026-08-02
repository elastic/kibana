/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PropsWithChildren } from 'react';
import { css } from '@emotion/react';

/**
 * The space between two chips on a row.
 *
 * Exported because it is measured as well as drawn: the helper that decides how many chips fit inside
 * two rows is told this number, so what wraps on screen and what the helper predicts cannot drift
 * apart. 6px rather than an EUI size token, from the prototype at `10e153f` — the tokens step from 4px
 * to 8px, and a chip row is the one place that difference is visible.
 */
export const ENTITY_CHIP_ROW_GAP_PX = 6;

/**
 * A wrapping row of {@link EntityChip}s.
 *
 * Its own component because the blast radius draws two of them from the same rules — the row an
 * analyst sees, and the hidden duplicate the overflow measurement reads. A row that wrapped
 * differently from the one being measured would answer the wrong question.
 */
export const EntityChipRow: React.FC<PropsWithChildren> = ({ children }) => (
  <div
    css={css`
      display: flex;
      flex-wrap: wrap;
      gap: ${ENTITY_CHIP_ROW_GAP_PX}px;
    `}
  >
    {children}
  </div>
);
