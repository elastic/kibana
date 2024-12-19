/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { css } from '@emotion/react';

interface Props {
  statusCode: string;
}
export const ResponseCodeColumn = ({ statusCode }: Props) => {
  return (
    <span
      css={css`
        margin-right: 16px;
      `}
    >
      {statusCode ? <EuiBadge data-test-subj="pingResponseCode">{statusCode}</EuiBadge> : '--'}
    </span>
  );
};
