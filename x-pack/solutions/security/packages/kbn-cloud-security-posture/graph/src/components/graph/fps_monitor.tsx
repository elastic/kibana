/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { FpsTrendline } from './fps_trendline';

export const FpsMonitor: React.FC = () => {
  const [fps, setFps] = useState(0);
  const frameCount = useRef(0);
  const lastTimestamp = useRef(performance.now());

  useEffect(() => {
    let animationFrameId: number;

    const calculateFPS = (timestamp: DOMHighResTimeStamp) => {
      frameCount.current += 1;
      const delta = timestamp - lastTimestamp.current;

      // Update FPS every second
      if (delta >= 1000) {
        setFps((frameCount.current * 1000) / delta);
        frameCount.current = 0;
        lastTimestamp.current = timestamp;
      }

      animationFrameId = requestAnimationFrame(calculateFPS);
    };

    animationFrameId = requestAnimationFrame(calculateFPS);

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div
      style={{
        padding: '10px',
        position: 'fixed',
      }}
    >
      <strong>{'FPS:'}</strong> {Math.round(fps)} <br />
      <strong>{'Nodes:'}</strong> {document.getElementsByClassName('react-flow__node').length}{' '}
      <strong>{'Edges:'}</strong> {document.getElementsByClassName('react-flow__edge').length}{' '}
      <FpsTrendline
        css={css`
          width: 300px;
        `}
      />
    </div>
  );
};
