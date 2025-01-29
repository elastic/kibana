/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from '@reduxjs/toolkit';
import deepEqual from 'react-fast-compare';
import {
  changePushVsOverlayAction,
  changeUserCollapsedWidthAction,
  changeUserExpandedWidthAction,
  changeUserSectionWidthsAction,
  closeLeftPanelAction,
  closePanelsAction,
  closePreviewPanelAction,
  closeRightPanelAction,
  openLeftPanelAction,
  openPanelsAction,
  openPreviewPanelAction,
  openRightPanelAction,
  previousPreviewPanelAction,
  resetAllUserChangedWidthsAction,
  setDefaultWidthsAction,
  urlChangedAction,
} from './actions';
import { initialPanelsState, initialUiState } from './state';

export const panelsReducer = createReducer(initialPanelsState, (builder) => {
  builder.addCase(openPanelsAction, (state, { payload: { preview, left, right, id } }) => {
    if (id in state.byId) {
      state.byId[id].right = right;
      state.byId[id].left = left;
      state.byId[id].preview = preview ? [preview] : undefined;
      if (right) {
        state.byId[id].history?.push(right);
      }
    } else {
      state.byId[id] = {
        left,
        right,
        preview: preview ? [preview] : undefined,
        history: right ? [right] : [],
      };
    }

    state.needsSync = true;
  });

  builder.addCase(openLeftPanelAction, (state, { payload: { left, id } }) => {
    if (id in state.byId) {
      state.byId[id].left = left;
    } else {
      state.byId[id] = {
        left,
        right: undefined,
        preview: undefined,
        history: [],
      };
    }

    state.needsSync = true;
  });

  builder.addCase(openRightPanelAction, (state, { payload: { right, id } }) => {
    if (id in state.byId) {
      state.byId[id].right = right;
    } else {
      state.byId[id] = {
        right,
        left: undefined,
        preview: undefined,
        history: [],
      };
    }

    state.needsSync = true;
  });

  builder.addCase(openPreviewPanelAction, (state, { payload: { preview, id } }) => {
    if (id in state.byId) {
      if (state.byId[id].preview) {
        const previewIdenticalToLastOne = deepEqual(preview, state.byId[id].preview?.at(-1));
        // Only append preview when it does not match the last item in state.data.byId[id].preview
        if (!previewIdenticalToLastOne) {
          state.byId[id].preview?.push(preview);
        }
      } else {
        state.byId[id].preview = preview ? [preview] : undefined;
      }
    } else {
      state.byId[id] = {
        right: undefined,
        left: undefined,
        preview: preview ? [preview] : undefined,
        history: [],
      };
    }

    state.needsSync = true;
  });

  builder.addCase(previousPreviewPanelAction, (state, { payload: { id } }) => {
    if (id in state.byId) {
      state.byId[id].preview?.pop();
    }

    // if state is stored in url, click go back in preview should utilize browser history
    state.needsSync = false;
  });

  builder.addCase(closePanelsAction, (state, { payload: { id } }) => {
    if (id in state.byId) {
      state.byId[id].right = undefined;
      state.byId[id].left = undefined;
      state.byId[id].preview = undefined;
    }

    state.needsSync = true;
  });

  builder.addCase(closeLeftPanelAction, (state, { payload: { id } }) => {
    if (id in state.byId) {
      state.byId[id].left = undefined;
    }

    state.needsSync = true;
  });

  builder.addCase(closeRightPanelAction, (state, { payload: { id } }) => {
    if (id in state.byId) {
      state.byId[id].right = undefined;
    }

    state.needsSync = true;
  });

  builder.addCase(closePreviewPanelAction, (state, { payload: { id } }) => {
    if (id in state.byId) {
      state.byId[id].preview = undefined;
    }

    state.needsSync = true;
  });

  builder.addCase(urlChangedAction, (state, { payload: { preview, left, right, id } }) => {
    if (id in state.byId) {
      state.byId[id].right = right;
      state.byId[id].left = left;
      state.byId[id].preview = preview ? [preview] : undefined;
    } else {
      state.byId[id] = {
        right,
        left,
        preview: preview ? [preview] : undefined,
        history: right ? [right] : [], // update history only when loading flyout on refresh
      };
    }

    state.needsSync = false;
  });
});

export const uiReducer = createReducer(initialUiState, (builder) => {
  builder.addCase(changePushVsOverlayAction, (state, { payload: { type } }) => {
    state.pushVsOverlay = type;
  });

  builder.addCase(
    setDefaultWidthsAction,
    (
      state,
      { payload: { rightOverlay, leftOverlay, previewOverlay, rightPush, leftPush, previewPush } }
    ) => {
      state.defaultWidths.overlay.rightWidth = rightOverlay;
      state.defaultWidths.overlay.leftWidth = leftOverlay;
      state.defaultWidths.overlay.previewWidth = previewOverlay;
      state.defaultWidths.overlay.rightPercentage =
        (rightOverlay / (rightOverlay + leftOverlay)) * 100;
      state.defaultWidths.overlay.leftPercentage =
        (leftOverlay / (rightOverlay + leftOverlay)) * 100;
      state.defaultWidths.overlay.previewPercentage =
        (previewOverlay / (previewOverlay + leftOverlay)) * 100;

      state.defaultWidths.push.rightWidth = rightPush;
      state.defaultWidths.push.leftWidth = leftPush;
      state.defaultWidths.push.previewWidth = previewPush;
      state.defaultWidths.push.rightPercentage = (rightPush / (rightPush + leftPush)) * 100;
      state.defaultWidths.push.leftPercentage = (leftPush / (rightPush + leftPush)) * 100;
      state.defaultWidths.push.previewPercentage = (previewPush / (previewPush + leftPush)) * 100;
    }
  );

  builder.addCase(changeUserCollapsedWidthAction, (state, { payload: { width } }) => {
    state.userFlyoutWidths.collapsedWidth = width;
  });

  builder.addCase(changeUserExpandedWidthAction, (state, { payload: { width } }) => {
    state.userFlyoutWidths.expandedWidth = width;
  });

  builder.addCase(changeUserSectionWidthsAction, (state, { payload: { right, left } }) => {
    state.userSectionWidths.leftPercentage = left;
    state.userSectionWidths.rightPercentage = right;
  });

  builder.addCase(resetAllUserChangedWidthsAction, (state) => {
    state.userFlyoutWidths.collapsedWidth = undefined;
    state.userFlyoutWidths.expandedWidth = undefined;
    state.userSectionWidths.leftPercentage = undefined;
    state.userSectionWidths.rightPercentage = undefined;
  });
});
