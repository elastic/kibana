/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from '@reduxjs/toolkit';
import {
  changeChildSizeAction,
  changeHasChildBackgroundAction,
  changeMainSizeAction,
  changePushVsOverlayAction,
  closeChildPanelAction,
  closePanelsAction,
  openChildPanelAction,
  openMainPanelAction,
  openPanelsAction,
} from './actions';
import { initialPanelsState, initialUiState } from './state';

export const panelsReducer = createReducer(initialPanelsState, (builder) => {
  builder.addCase(openPanelsAction, (state, { payload: { child, main } }) => {
    state.main = main;
    state.child = child;
  });

  builder.addCase(openChildPanelAction, (state, { payload: { child } }) => {
    state.child = child;
  });

  builder.addCase(openMainPanelAction, (state, { payload: { main } }) => {
    state.main = main;
  });

  builder.addCase(closePanelsAction, (state) => {
    state.main = undefined;
    state.child = undefined;
  });

  builder.addCase(closeChildPanelAction, (state) => {
    state.child = undefined;
  });
});

export const uiReducer = createReducer(initialUiState, (builder) => {
  builder.addCase(changePushVsOverlayAction, (state, { payload: { type } }) => {
    state.pushVsOverlay = type;
  });

  builder.addCase(changeMainSizeAction, (state, { payload: { size } }) => {
    state.mainSize = size;
  });

  builder.addCase(changeChildSizeAction, (state, { payload: { size } }) => {
    state.childSize = size;
  });

  builder.addCase(changeHasChildBackgroundAction, (state, { payload: { hasChildBackground } }) => {
    state.hasChildBackground = hasChildBackground;
  });
});
