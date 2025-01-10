/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLayoutEffect, useState } from 'react';
import { useDispatch } from '../store/redux';
import { setDefaultWidthsAction } from '../store/actions';

export const MIN_RESOLUTION_BREAKPOINT = 992;
export const MAX_RESOLUTION_BREAKPOINT = 1920;
export const BIG_RESOLUTION_BREAKPOINT = 2560;
const FULL_WIDTH_BREAKPOINT = 1600;

export const RIGHT_SECTION_MIN_WIDTH_OVERLAY_MODE = 380;
export const RIGHT_SECTION_MAX_WIDTH_OVERLAY_MODE = 750;

export const RIGHT_SECTION_MIN_WIDTH_PUSH_MODE = 380;
export const RIGHT_SECTION_MAX_WIDTH_PUSH_MODE = 600;

export const LEFT_SECTION_MIN_WIDTH_PUSH_MODE = 380;
export const LEFT_SECTION_MAX_WIDTH_PUSH_MODE = 750;
const LEFT_SECTION_MAX_WIDTH = 1500;

export const FULL_WIDTH_PADDING = 48;

/**
 * Hook that returns the browser window width
 */
export const useWindowWidth = (): number => {
  const dispatch = useDispatch();

  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    function updateSize() {
      setWidth(window.innerWidth);

      const windowWidth = window.innerWidth;
      if (windowWidth !== 0) {
        let rightSectionWidthOverlayMode: number;
        let rightSectionWidthPushMode: number;
        if (windowWidth < MIN_RESOLUTION_BREAKPOINT) {
          // the right section's width will grow from 380px (at 992px resolution) while handling tiny screens by not going smaller than the window width
          rightSectionWidthOverlayMode = Math.min(
            RIGHT_SECTION_MIN_WIDTH_OVERLAY_MODE,
            windowWidth
          );
          rightSectionWidthPushMode = Math.min(RIGHT_SECTION_MIN_WIDTH_PUSH_MODE, windowWidth);
        } else {
          const ratioWidthOverlayMode =
            (RIGHT_SECTION_MAX_WIDTH_OVERLAY_MODE - RIGHT_SECTION_MIN_WIDTH_OVERLAY_MODE) *
            ((windowWidth - MIN_RESOLUTION_BREAKPOINT) /
              (MAX_RESOLUTION_BREAKPOINT - MIN_RESOLUTION_BREAKPOINT));

          // the right section's width will grow to 750px (at 1920px resolution) and will never go bigger than 750px in higher resolutions
          rightSectionWidthOverlayMode = Math.min(
            RIGHT_SECTION_MIN_WIDTH_OVERLAY_MODE + ratioWidthOverlayMode,
            RIGHT_SECTION_MAX_WIDTH_OVERLAY_MODE
          );

          const ratioWidthPushMode =
            (RIGHT_SECTION_MAX_WIDTH_PUSH_MODE - RIGHT_SECTION_MIN_WIDTH_PUSH_MODE) *
            ((windowWidth - FULL_WIDTH_BREAKPOINT) /
              (BIG_RESOLUTION_BREAKPOINT - FULL_WIDTH_BREAKPOINT));

          // the right section's width will grow to 750px (at 1920px resolution) and will never go bigger than 750px in higher resolutions
          rightSectionWidthPushMode = Math.min(
            RIGHT_SECTION_MIN_WIDTH_PUSH_MODE + ratioWidthPushMode,
            RIGHT_SECTION_MAX_WIDTH_PUSH_MODE
          );
        }

        let leftSectionWidthOverlayMode: number;
        // the left section's width will be nearly the remaining space for resolution lower than 1600px
        if (windowWidth <= FULL_WIDTH_BREAKPOINT) {
          leftSectionWidthOverlayMode =
            windowWidth - rightSectionWidthOverlayMode - FULL_WIDTH_PADDING;
        } else {
          // the left section's width will be taking 80% of the remaining space for resolution higher than 1600px, while never going bigger than 1500px
          leftSectionWidthOverlayMode = Math.min(
            ((windowWidth - rightSectionWidthOverlayMode) * 80) / 100,
            LEFT_SECTION_MAX_WIDTH
          );
        }

        const ratioWidthPushMode =
          (LEFT_SECTION_MAX_WIDTH_PUSH_MODE - LEFT_SECTION_MIN_WIDTH_PUSH_MODE) *
          ((windowWidth - FULL_WIDTH_BREAKPOINT) /
            (BIG_RESOLUTION_BREAKPOINT - FULL_WIDTH_BREAKPOINT));

        // the right section's width will grow to 750px (at 1920px resolution) and will never go bigger than 750px in higher resolutions
        const leftSectionWidthPushMode = Math.min(
          LEFT_SECTION_MIN_WIDTH_PUSH_MODE + ratioWidthPushMode,
          LEFT_SECTION_MAX_WIDTH_PUSH_MODE
        );

        const previewSectionWidthOverlayMode: number = rightSectionWidthOverlayMode;
        const previewSectionWidthPushMode: number = rightSectionWidthPushMode;

        dispatch(
          setDefaultWidthsAction({
            rightOverlay: rightSectionWidthOverlayMode,
            leftOverlay: leftSectionWidthOverlayMode,
            previewOverlay: previewSectionWidthOverlayMode,
            rightPush: rightSectionWidthPushMode,
            leftPush: leftSectionWidthPushMode,
            previewPush: previewSectionWidthPushMode,
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
