/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCopy, EuiIcon } from '@elastic/eui';
import { css } from '@emotion/react';

export const CopyButton: React.FC<{ copyText: string }> = ({ copyText }) => (
  <EuiCopy textToCopy={copyText}>
    {(copy) => (
      <EuiIcon
        css={css`
          :hover {
            cursor: pointer;
          }
        `}
        onClick={copy}
        type="copy"
      />
    )}
  </EuiCopy>
);
