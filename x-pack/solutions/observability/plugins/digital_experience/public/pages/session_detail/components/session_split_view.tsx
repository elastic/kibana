/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, type ReactNode } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import useDebounce from 'react-use/lib/useDebounce';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { EuiFlyout } from '@elastic/eui';
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

/** Where the sessions list shows: beside the session, in a flyout over it, or not at all. */
export type RailPlacement = 'left' | 'right' | 'flyout' | 'hidden';

const FLYOUT_LABEL = i18n.translate('xpack.digitalExperience.sessionDetail.rail.flyoutLabel', {
  defaultMessage: 'Sessions',
});

/**
 * The session beside the sessions list, which the user can resize, the list in a flyout, or the
 * session alone when the list is hidden.
 */
export function SessionSplitView({
  placement,
  rail,
  onHideRail,
  children,
}: {
  placement: RailPlacement;
  rail: ReactNode;
  /** Called when the flyout is closed, e.g. with Escape. */
  onHideRail: () => void;
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

  if (placement === 'hidden') {
    return <>{children}</>;
  }

  if (placement === 'flyout') {
    return (
      <>
        {children}
        {/* Pushes the session aside, so the list and the session can be used together. */}
        <EuiFlyout
          type="push"
          ownFocus={false}
          paddingSize="none"
          hideCloseButton
          resizable
          size={railWidth}
          minWidth={MIN_RAIL_WIDTH}
          onResize={setRailWidth}
          onClose={onHideRail}
          aria-label={FLYOUT_LABEL}
          data-test-subj="digitalExperienceSessionsFlyout"
        >
          {rail}
        </EuiFlyout>
      </>
    );
  }

  const railSide = placement;
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
