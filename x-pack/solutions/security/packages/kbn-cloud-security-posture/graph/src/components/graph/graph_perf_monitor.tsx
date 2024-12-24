/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { FpsTrendline } from './fps_trendline';

export const GraphPerfMonitor: React.FC = () => {
  return (
    <div
      css={{
        padding: '10px',
        position: 'fixed',
      }}
    >
      <strong>{'Nodes:'}</strong> {document.getElementsByClassName('react-flow__node').length}{' '}
      <strong>{'Edges:'}</strong> {document.getElementsByClassName('react-flow__edge').length}
      <FpsTrendline
        css={css`
          width: 300px;
        `}
      />
    </div>
  );
};
