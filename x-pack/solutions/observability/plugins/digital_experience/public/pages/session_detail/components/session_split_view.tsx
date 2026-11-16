/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, type ReactNode } from 'react';
import { css } from '@emotion/react';
import useDebounce from 'react-use/lib/useDebounce';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import {
  ResizableLayout,
  ResizableLayoutDirection,
  ResizableLayoutMode,
  ResizableLayoutOrder,
} from '@kbn/resizable-layout';

/** The width of the sessions list, in pixels, kept across visits. */
const RAIL_WIDTH_STORAGE_KEY = 'digitalExperience.sessionDetail.railWidthPx';
const DEFAULT_RAIL_WIDTH = 360;
const MIN_RAIL_WIDTH = 240;
/** The session keeps enough room for its waterfall, whatever the list is given. */
const MIN_DETAIL_WIDTH = 520;
/** How long after the user stops dragging the width is stored. */
const WIDTH_SAVE_DEBOUNCE_MS = 300;

const clampWidth = (width: unknown): number =>
  typeof width === 'number' && Number.isFinite(width)
    ? Math.max(MIN_RAIL_WIDTH, width)
    : DEFAULT_RAIL_WIDTH;

// Fills the app's height, so that the list and the session each scroll on their own.
const containerCss = css({
  height: 'var(--kbn-application--content-height, calc(100vh - var(--euiFixedHeadersOffset, 0px)))',
});

/**
 * The session beside the sessions list, which the user can resize, or the session alone when the
 * list is hidden.
 */
export function SessionSplitView({
  railOpen,
  railSide,
  rail,
  children,
}: {
  railOpen: boolean;
  /** The side of the session the list shows on. */
  railSide: 'left' | 'right';
  rail: ReactNode;
  children: ReactNode;
}) {
  const [savedWidth, setSavedWidth] = useLocalStorage<number>(
    RAIL_WIDTH_STORAGE_KEY,
    DEFAULT_RAIL_WIDTH
  );
  const [railWidth, setRailWidth] = useState(() => clampWidth(savedWidth));
  // A drag reports a width on every mouse move; what the user settled on is stored once, after.
  useDebounce(
    () => {
      if (railWidth !== savedWidth) {
        setSavedWidth(railWidth);
      }
    },
    WIDTH_SAVE_DEBOUNCE_MS,
    [railWidth]
  );

  if (!railOpen) {
    return <>{children}</>;
  }

  return (
    <div
      css={containerCss}
      data-test-subj="digitalExperienceSessionSplitView"
      data-rail-side={railSide}
    >
      <ResizableLayout
        mode={ResizableLayoutMode.Resizable}
        direction={ResizableLayoutDirection.Horizontal}
        // The list keeps its width when the window resizes; the session takes the rest.
        fixedPanel={rail}
        fixedPanelSize={railWidth}
        fixedPanelOrder={
          railSide === 'right' ? ResizableLayoutOrder.End : ResizableLayoutOrder.Start
        }
        minFixedPanelSize={MIN_RAIL_WIDTH}
        flexPanel={children}
        minFlexPanelSize={MIN_DETAIL_WIDTH}
        onFixedPanelSizeChange={setRailWidth}
        data-test-subj="digitalExperienceSessionSplit"
      />
    </div>
  );
}
