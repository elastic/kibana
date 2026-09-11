/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type PropsWithChildren } from 'react';
import { css } from '@emotion/react';
import { useViewportZoom } from '../../hooks/use_viewport_zoom';
import { GRAPH_ZOOM_INVARIANT_MAX_SCALE } from '../constants';

/**
 * Counter-scales node content so markers stay near-constant screen size while
 * the viewport zooms (Google Maps–style). Scale is capped so zooming out cannot
 * enlarge nodes past the layout footprint enough to overlap neighbors.
 */
export const ZoomInvariantWrapper = ({ children }: PropsWithChildren) => {
  const zoom = useViewportZoom();
  const scale = Math.min(1 / zoom, GRAPH_ZOOM_INVARIANT_MAX_SCALE);

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
