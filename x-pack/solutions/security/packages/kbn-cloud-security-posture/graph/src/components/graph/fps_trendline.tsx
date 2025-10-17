/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import type { CommonProps } from '@elastic/eui';

export const FpsTrendline: React.FC<CommonProps> = (props: CommonProps) => {
  const [fpsSamples, setFpsSamples] = useState<number[]>([]);
  const frameCount = useRef(0);
  const lastTimestamp = useRef(performance.now());

  useEffect(() => {
    let animationFrameId: number;

    const calculateFPS = (timestamp: number) => {
      frameCount.current += 1;
      const delta = timestamp - lastTimestamp.current;

      if (delta >= 1000) {
        const fps = (frameCount.current * 1000) / delta;
        setFpsSamples((prevSamples) => {
          const updatedSamples = [...prevSamples, fps];
          return updatedSamples.slice(-20);
        });
        frameCount.current = 0;
        lastTimestamp.current = timestamp;
      }

      animationFrameId = requestAnimationFrame(calculateFPS);
    };

    animationFrameId = requestAnimationFrame(calculateFPS);

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const getBarColor = (fps: number): string => {
    if (fps >= 50) return '#4caf50'; // Green
    if (fps >= 30) return '#ffeb3b'; // Yellow
    return '#f44336'; // Red
  };

  return (
    <div {...props}>
      <strong>{'FPS:'}</strong> {Math.round(fpsSamples[fpsSamples.length - 1])} <br />
      <div
        css={{
          display: 'flex',
          alignItems: 'flex-end',
          height: '30px',
          padding: '5px',
        }}
      >
        {fpsSamples.map((fps, index) => (
          <div
            key={index}
            css={{
              height: `${Math.min(fps, 60) * (100 / 60)}%`,
              width: '5%',
              backgroundColor: getBarColor(fps),
              marginRight: '2px',
            }}
            title={`${fps.toFixed(2)} FPS`}
          >
            <div
              css={{
                fontSize: '8px',
                padding: '2px',
                left: `${index * 5 + 5}%`,
              }}
            >
              {fps.toFixed(0)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
