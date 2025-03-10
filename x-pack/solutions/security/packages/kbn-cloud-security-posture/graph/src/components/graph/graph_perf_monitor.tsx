/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { css } from '@emotion/react';
import { FpsTrendline } from './fps_trendline';

export const GraphPerfMonitor: React.FC = () => {
  const [nodeCount, setNodeCount] = useState(0);
  const [edgeCount, setEdgeCount] = useState(0);
  const updateCounts = () => {
    setNodeCount(document.getElementsByClassName('react-flow__node').length);
    setEdgeCount(document.getElementsByClassName('react-flow__edge').length);
  };

  useEffect(() => {
    const intervalId = setInterval(updateCounts, 300);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div
      css={{
        padding: '10px',
        position: 'fixed',
      }}
    >
      <strong>{'Nodes:'}</strong> {nodeCount} <strong>{'Edges:'}</strong> {edgeCount}
      <FpsTrendline
        css={css`
          width: 300px;
        `}
      />
    </div>
  );
};
