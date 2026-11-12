/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode } from 'react';
import { css } from '@emotion/react';
import { EuiResizableContainer } from '@elastic/eui';
import useLocalStorage from 'react-use/lib/useLocalStorage';

const RAIL_PANEL_ID = 'sessionsRail';
const DETAIL_PANEL_ID = 'session';
/** The width of the sessions list, in percent, kept across visits. */
const RAIL_WIDTH_STORAGE_KEY = 'digitalExperience.sessionDetail.railWidth';
const DEFAULT_RAIL_WIDTH = 22;
const MIN_RAIL_WIDTH_PERCENT = 12;
const MAX_RAIL_WIDTH_PERCENT = 45;

const clampWidth = (width: unknown): number =>
  typeof width === 'number' && Number.isFinite(width)
    ? Math.min(MAX_RAIL_WIDTH_PERCENT, Math.max(MIN_RAIL_WIDTH_PERCENT, width))
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
  rail,
  children,
}: {
  railOpen: boolean;
  rail: ReactNode;
  children: ReactNode;
}) {
  const [savedWidth, setSavedWidth] = useLocalStorage<number>(
    RAIL_WIDTH_STORAGE_KEY,
    DEFAULT_RAIL_WIDTH
  );
  const railWidth = clampWidth(savedWidth);

  if (!railOpen) {
    return <>{children}</>;
  }

  return (
    <EuiResizableContainer
      css={containerCss}
      data-test-subj="digitalExperienceSessionSplitView"
      onPanelWidthChange={(sizes) => setSavedWidth(clampWidth(sizes[RAIL_PANEL_ID]))}
    >
      {(EuiResizablePanel, EuiResizableButton) => (
        <>
          <EuiResizablePanel
            id={RAIL_PANEL_ID}
            size={railWidth}
            minSize={`${MIN_RAIL_WIDTH_PERCENT}%`}
            paddingSize="none"
            scrollable={false}
          >
            {rail}
          </EuiResizablePanel>
          <EuiResizableButton />
          <EuiResizablePanel
            id={DETAIL_PANEL_ID}
            size={100 - railWidth}
            minSize="50%"
            paddingSize="none"
          >
            {children}
          </EuiResizablePanel>
        </>
      )}
    </EuiResizableContainer>
  );
}
