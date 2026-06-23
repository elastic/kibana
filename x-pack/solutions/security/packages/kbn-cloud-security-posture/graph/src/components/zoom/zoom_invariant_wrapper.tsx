/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type PropsWithChildren } from 'react';
import { css } from '@emotion/react';
import { useViewportZoom } from '../../hooks/use_viewport_zoom';

/**
 * Counter-scales node content so it stays a constant screen size while the
 * viewport zooms (Google Maps–style markers).
 */
export const ZoomInvariantWrapper = ({ children }: PropsWithChildren) => {
  const zoom = useViewportZoom();
  const scale = 1 / zoom;

  if (Math.abs(scale - 1) < 0.001) {
    return <>{children}</>;
  }

  return (
    <div
      css={css`
        transform: scale(${scale});
        transform-origin: center center;
      `}
    >
      {children}
    </div>
  );
};
