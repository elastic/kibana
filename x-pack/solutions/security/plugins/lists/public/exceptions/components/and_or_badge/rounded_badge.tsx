/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';

import * as i18n from './translations';

import type { AndOr } from '.';

const roundBadgeStyles = css`
  align-items: center;
  border-radius: 100%;
  display: inline-flex;
  font-size: 9px;
  justify-content: center;
  margin: 0 5px 0 5px;
  padding: 7px 6px 4px 6px;
  user-select: none;
  width: 40px;
  height: 40px;
  .euiBadge__content {
    position: relative;
    top: -1px;
  }
  .euiBadge__text {
    text-overflow: clip;
  }
`;

export const RoundedBadge: React.FC<{ type: AndOr }> = ({ type }) => (
  <EuiBadge css={roundBadgeStyles} data-test-subj="and-or-badge" color="hollow">
    {type === 'and' ? i18n.AND : i18n.OR}
  </EuiBadge>
);

RoundedBadge.displayName = 'RoundedBadge';
