/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, type ReactNode } from 'react';
import { EuiFlyout } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import useDebounce from 'react-use/lib/useDebounce';
import useLocalStorage from 'react-use/lib/useLocalStorage';

/** The width of the sessions list, in pixels, kept across visits. */
const FLYOUT_WIDTH_STORAGE_KEY = 'digitalExperience.sessionDetail.railWidthPx';
const DEFAULT_FLYOUT_WIDTH = 360;
const MIN_FLYOUT_WIDTH = 240;
/** How long after the user stops dragging the width is stored. */
const WIDTH_SAVE_DEBOUNCE_MS = 300;

const FLYOUT_LABEL = i18n.translate('xpack.digitalExperience.sessionDetail.rail.flyoutLabel', {
  defaultMessage: 'Sessions',
});

const clampWidth = (width: unknown): number =>
  typeof width === 'number' && Number.isFinite(width)
    ? Math.max(MIN_FLYOUT_WIDTH, width)
    : DEFAULT_FLYOUT_WIDTH;

/**
 * The sessions list in a resizable flyout that pushes the session aside, so the user can step
 * from session to session with both in view.
 */
export function SessionsFlyout({
  onClose,
  children,
}: {
  onClose: () => void;
  children: ReactNode;
}) {
  const [savedWidth, setSavedWidth] = useLocalStorage<number>(
    FLYOUT_WIDTH_STORAGE_KEY,
    DEFAULT_FLYOUT_WIDTH
  );
  const [width, setWidth] = useState(() => clampWidth(savedWidth));
  // A drag reports a width on every mouse move; what the user settled on is stored once, after.
  useDebounce(
    () => {
      if (width !== savedWidth) {
        setSavedWidth(width);
      }
    },
    WIDTH_SAVE_DEBOUNCE_MS,
    [width]
  );

  return (
    <EuiFlyout
      type="push"
      ownFocus={false}
      paddingSize="none"
      hideCloseButton
      resizable
      size={width}
      minWidth={MIN_FLYOUT_WIDTH}
      onResize={setWidth}
      onClose={onClose}
      aria-label={FLYOUT_LABEL}
      data-test-subj="digitalExperienceSessionsFlyout"
    >
      {children}
    </EuiFlyout>
  );
}
