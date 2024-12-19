/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { Ping } from '../../../../../../../../common/runtime_types';

interface Props {
  errorType: string;
  ping: Ping;
}

export const PingErrorCol = ({ errorType, ping }: Props) => {
  if (!errorType) {
    return <>--</>;
  }
  return (
    <span
      css={css`
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 3;
        overflow: hidden;
      `}
    >
      {errorType}:{ping.error?.message}
    </span>
  );
};
