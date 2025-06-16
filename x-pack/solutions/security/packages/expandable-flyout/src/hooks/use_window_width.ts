/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLayoutEffect, useState } from 'react';
import { useDispatch } from '../store/redux';
import { setDefaultWidthsAction } from '../store/actions';

const RESOLUTION_BREAKPOINTS = {
  RIGHT: {
    MIN: 992, // resolution below which the width is fixed to 380px
    OVERLAY_MAX: 1920, // resolution above which the overlay width is fixed to 750px
    PUSH_MIN: 1600, // resolution below which the push width is fixed to 380px
    PUSH_MAX: 2560, // resolution above which the push width is fixed to 600px
  },
  LEFT: {
    MIN: 1600, // resolution below which the overlay width goes full width (minus the padding) and the push width goes to its fixed 380px
  },
};
const FULL_WIDTH_PADDING = 48;
const NAVIGATION_WIDTH = 200;

const SECTION_WIDTHS = {
  RIGHT: {
    MIN: 380,
    OVERLAY_MAX: 750,
    PUSH_MAX: 600,
  },
  LEFT: {
    OVERLAY_MAX: 1500,
    PUSH_MIN: 380,
  },
};

/**
 * Calculates the default widths for the right section of the expandable flyout in push and overlay modes.
 *
 * For overlay mode, the flyout right section scales as follows:
 *  - for window widths below 380px, we make sure that the width is identical to the window width
 *  - for window widths between 380px and 992px, the width is fixed at 380px
 *  - for window widths between 992px and 1920px, the width scales linearly between 380px and 750px
 *  - for window widths above 1920px, the width is fixed at 750px
 *
 *  For push mode, the flyout right section scales as follows:
 *  - for window widths below 380px, we make sure that the flyout width is identical to the window width (also, EUI actually automatically switches the flyout to overlay mode)
 *  - for window widths between 380px and 1600px, the width is fixed at 380px
 *  - for window widths between 1600x and 2560px, the width scales linearly between 380px and 600px
 *  - for window widths above 2560px, the width is fixed at 600px
 */
const calculateRightSectionDefaultWidths = (
  windowWidth: number
): {
  overlay: number;
  push: number;
} => {
  // for tiny window widths (less than 380px), we want to make sure the flyout will not go outside the window width
  if (windowWidth < SECTION_WIDTHS.RIGHT.MIN) {
    return {
      overlay: windowWidth,
      push: windowWidth,
    };
  }

  // for window widths between 380px and 992px, the width is fixed to the 380px
  // EUI automatically switches a push flyout to overlay below 992px, so the push value here is actually a bit unnecessary but we return it anyway to ensure the redux store is always populated with a value
  if (windowWidth < RESOLUTION_BREAKPOINTS.RIGHT.MIN) {
    return {
      overlay: SECTION_WIDTHS.RIGHT.MIN,
      push: SECTION_WIDTHS.RIGHT.MIN,
    };
  }

  // in overlay mode, the width will linearly scale from 380px (at 992px resolution) to 750px (at 1920px resolution)
  const ratioWidthOverlayMode =
    (SECTION_WIDTHS.RIGHT.OVERLAY_MAX - SECTION_WIDTHS.RIGHT.MIN) *
    ((windowWidth - RESOLUTION_BREAKPOINTS.RIGHT.MIN) /
      (RESOLUTION_BREAKPOINTS.RIGHT.OVERLAY_MAX - RESOLUTION_BREAKPOINTS.RIGHT.MIN));
  // this will ensure that in push in mode the width will never go bigger than 750px in higher resolutions
  const overlayWidth = Math.min(
    SECTION_WIDTHS.RIGHT.MIN + ratioWidthOverlayMode,
    SECTION_WIDTHS.RIGHT.OVERLAY_MAX
  );

  // in push mode, the width will linearly scale from 380px (at 1600px resolution) to 600px (at 2560px resolution)
  const ratioWidthPushMode =
    (SECTION_WIDTHS.RIGHT.PUSH_MAX - SECTION_WIDTHS.RIGHT.MIN) *
    ((windowWidth - RESOLUTION_BREAKPOINTS.RIGHT.PUSH_MIN) /
      (RESOLUTION_BREAKPOINTS.RIGHT.PUSH_MAX - RESOLUTION_BREAKPOINTS.RIGHT.PUSH_MIN));
  // this will ensure that in push mode the width will never go bigger than 600px in higher resolutions
  const pushWidth = Math.min(
    SECTION_WIDTHS.RIGHT.MIN + ratioWidthPushMode,
    SECTION_WIDTHS.RIGHT.PUSH_MAX
  );

  return {
    overlay: overlayWidth,
    push: pushWidth,
  };
};

/**
 * Calculates the default widths for the left section of the expandable flyout in push and overlay modes.
 *
 * For overlay mode, the flyout left section scales as follows:
 *  - for window widths below 1600px, the width is taking the full screen minus a 48px padding
 *  - for window widths above 1600px, the width corresponds to 80% of the remaining space
 *
 *  For push mode, the flyout left section scales as follows:
 *  - for window widths below 1600px, the width is fixed at 380px
 *  - for window widths above 1600px, the width corresponds to 40% of the remaining space
 */
const calculateLeftSectionDefaultWidths = (
  windowWidth: number,
  rightSectionWidthOverlay: number,
  rightSectionWidthPush: number
): {
  overlay: number;
  push: number;
} => {
  // for window widths below 1600px, the overlay width will use the remaining space (minus a small padding)
  // for window widths above 1600px, the overlay width will use 80% of the remaining space, while never going bigger than 1500px
  const overlayWidth =
    windowWidth <= RESOLUTION_BREAKPOINTS.LEFT.MIN
      ? windowWidth - rightSectionWidthOverlay - FULL_WIDTH_PADDING
      : Math.min(
          ((windowWidth - rightSectionWidthOverlay) * 80) / 100,
          SECTION_WIDTHS.LEFT.OVERLAY_MAX
        );

  // for window widths below 1600px, the push width will be fixed to 380px
  // for window widths above 1600px, the push width will use 40% of the remaining space (excluding the navigation width)
  const pushWidth =
    windowWidth <= RESOLUTION_BREAKPOINTS.LEFT.MIN
      ? SECTION_WIDTHS.LEFT.PUSH_MIN
      : ((windowWidth - rightSectionWidthPush - NAVIGATION_WIDTH) * 40) / 100;

  return {
    overlay: overlayWidth,
    push: pushWidth,
  };
};

/**
 * Hook that returns the browser window width.
 * It also calculates all the default widths values for the flyout to render in overlay and push modes then stores them in Redux.
 */
export const useWindowWidth = (): number => {
  const dispatch = useDispatch();

  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    function updateSize() {
      setWidth(window.innerWidth);

      const windowWidth = window.innerWidth;

      // if the browser's window width is 0 (which should only happen the very first time this hook is called) there is no point in calculating all the default flyout's widths
      if (windowWidth !== 0) {
        const { overlay: rightSectionWidthOverlay, push: rightSectionWidthPush } =
          calculateRightSectionDefaultWidths(windowWidth);

        const { overlay: leftSectionWidthOverlay, push: leftSectionWidthPush } =
          calculateLeftSectionDefaultWidths(
            windowWidth,
            rightSectionWidthOverlay,
            rightSectionWidthPush
          );

        const previewSectionWidthOverlay: number = rightSectionWidthOverlay;
        const previewSectionWidthPush: number = rightSectionWidthPush;

        dispatch(
          setDefaultWidthsAction({
            rightOverlay: rightSectionWidthOverlay,
            leftOverlay: leftSectionWidthOverlay,
            previewOverlay: previewSectionWidthOverlay,
            rightPush: rightSectionWidthPush,
            leftPush: leftSectionWidthPush,
            previewPush: previewSectionWidthPush,
          })
        );
      }
    }

    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, [dispatch]);

  return width;
};
