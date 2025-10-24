/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from '@reduxjs/toolkit';
import type { EuiFlyoutSize } from '@elastic/eui/src/components/flyout/const';
import type { CSSProperties } from 'react';
import type { FlyoutPanelProps } from '../types';

export enum ActionType {
  openFlyout = 'open_flyout',
  openMainPanel = 'open_main_panel',
  openChildPanel = 'open_child_panel',
  closeChildPanel = 'close_child_panel',
  closeFlyout = 'close_flyout',

  changePushVsOverlay = 'change_push_overlay',

  changeMainSize = 'change_main_size',
  changeChildSize = 'change_child_size',

  changeHasChildBackground = 'change_has_child_background',
}

export const openPanelsAction = createAction<{
  /**
   * Panel to render in the main section
   */
  main?: FlyoutPanelProps;
  /**
   * Panel to render in the child section
   */
  child?: FlyoutPanelProps;
}>(ActionType.openFlyout);

export const openMainPanelAction = createAction<{
  /**
   * Panel to render in the main section
   */
  main: FlyoutPanelProps;
}>(ActionType.openMainPanel);
export const openChildPanelAction = createAction<{
  /**
   * Panel to render in the child section
   */
  child: FlyoutPanelProps;
}>(ActionType.openChildPanel);

export const closePanelsAction = createAction(ActionType.closeFlyout);
export const closeChildPanelAction = createAction(ActionType.closeChildPanel);

export const changePushVsOverlayAction = createAction<{
  /**
   * Type of flyout to render, value and only be 'push' or 'overlay'
   */
  type: 'push' | 'overlay';
}>(ActionType.changePushVsOverlay);

export const changeMainSizeAction = createAction<{
  size: EuiFlyoutSize | CSSProperties['width'];
}>(ActionType.changeMainSize);
export const changeChildSizeAction = createAction<{
  size: EuiFlyoutSize | CSSProperties['width'];
}>(ActionType.changeChildSize);

export const changeHasChildBackgroundAction = createAction<{
  hasChildBackground: boolean;
}>(ActionType.changeHasChildBackground);
