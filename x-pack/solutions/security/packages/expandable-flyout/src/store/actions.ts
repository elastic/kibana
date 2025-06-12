/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from '@reduxjs/toolkit';
import { FlyoutPanelProps } from '../types';

export enum ActionType {
  openFlyout = 'open_flyout',
  openRightPanel = 'open_right_panel',
  openLeftPanel = 'open_left_panel',
  openPreviewPanel = 'open_preview_panel',
  closeRightPanel = 'close_right_panel',
  closeLeftPanel = 'close_left_panel',
  closePreviewPanel = 'close_preview_panel',
  previousPreviewPanel = 'previous_preview_panel',
  closeFlyout = 'close_flyout',
  urlChanged = 'urlChanged',

  changePushVsOverlay = 'change_push_overlay',

  setDefaultWidths = 'set_default_widths',

  changeUserCollapsedWidth = 'change_user_collapsed_width',
  changeUserExpandedWidth = 'change_user_expanded_width',

  changeUserSectionWidths = 'change_user_section_widths',

  resetAllUserWidths = 'reset_all_user_widths',
}

export const openPanelsAction = createAction<{
  /**
   * Panel to render in the right section
   */
  right?: FlyoutPanelProps;
  /**
   * Panel to render in the left section
   */
  left?: FlyoutPanelProps;
  /**
   * Panels to render in the preview section
   */
  preview?: FlyoutPanelProps;
  /**
   * Unique identifier for the flyout (either the urlKey or 'memory')
   */
  id: string;
}>(ActionType.openFlyout);

export const openRightPanelAction = createAction<{
  /**
   * Panel to render in the right section
   */
  right: FlyoutPanelProps;
  /**
   * Unique identifier for the flyout (either the urlKey or 'memory')
   */
  id: string;
}>(ActionType.openRightPanel);
export const openLeftPanelAction = createAction<{
  /**
   * Panel to render in the left section
   */
  left: FlyoutPanelProps;
  /**
   * Unique identifier for the flyout (either the urlKey or 'memory')
   */
  id: string;
}>(ActionType.openLeftPanel);
export const openPreviewPanelAction = createAction<{
  /**
   * Panels to render in the preview section
   */
  preview: FlyoutPanelProps;
  id: string;
}>(ActionType.openPreviewPanel);

export const closePanelsAction = createAction<{
  /**
   * Unique identifier for the flyout (either the urlKey or 'memory')
   */
  id: string;
}>(ActionType.closeFlyout);
export const closeRightPanelAction = createAction<{
  /**
   * Unique identifier for the flyout (either the urlKey or 'memory')
   */
  id: string;
}>(ActionType.closeRightPanel);
export const closeLeftPanelAction = createAction<{
  /**
   * Unique identifier for the flyout (either the urlKey or 'memory')
   */
  id: string;
}>(ActionType.closeLeftPanel);
export const closePreviewPanelAction = createAction<{
  /**
   * Unique identifier for the flyout (either the urlKey or 'memory')
   */
  id: string;
}>(ActionType.closePreviewPanel);

export const previousPreviewPanelAction = createAction<{
  /**
   * Unique identifier for the flyout (either the urlKey or 'memory')
   */
  id: string;
}>(ActionType.previousPreviewPanel);

export const urlChangedAction = createAction<{
  /**
   * Panel to render in the right section
   */
  right?: FlyoutPanelProps;
  /**
   * Panel to render in the left section
   */
  left?: FlyoutPanelProps;
  /**
   * Panels to render in the preview section
   */
  preview?: FlyoutPanelProps;
  /**
   * Unique identifier for the flyout (either the urlKey or 'memory')
   */
  id: string;
}>(ActionType.urlChanged);

export const changePushVsOverlayAction = createAction<{
  /**
   * Type of flyout to render, value and only be 'push' or 'overlay'
   */
  type: 'push' | 'overlay';
  /**
   * Used in the redux middleware to decide if the value needs to be saved to local storage.
   * This is used to avoid saving the value to local storage when the value is changed by code instead of by a user action.
   */
  savedToLocalStorage: boolean;
}>(ActionType.changePushVsOverlay);

export const setDefaultWidthsAction = createAction<{
  /**
   * Default width for the right section in overlay mode
   */
  rightOverlay: number;
  /**
   * Default width for the left section in overlay mode
   */
  leftOverlay: number;
  /**
   * Default width for the preview section in overlay mode
   */
  previewOverlay: number;
  /**
   * Default width for the right section in push mode
   */
  rightPush: number;
  /**
   * Default width for the left section in push mode
   */
  leftPush: number;
  /**
   * Default width for the preview section in push mode
   */
  previewPush: number;
}>(ActionType.setDefaultWidths);

export const changeUserCollapsedWidthAction = createAction<{
  /**
   * Width of the collapsed flyout
   */
  width: number;
  /**
   * Used in the redux middleware to decide if the value needs to be saved to local storage.
   */
  savedToLocalStorage: boolean;
}>(ActionType.changeUserCollapsedWidth);

export const changeUserExpandedWidthAction = createAction<{
  /**
   * Width of the expanded flyout
   */
  width: number;
  /**
   * Used in the redux middleware to decide if the value needs to be saved to local storage.
   */
  savedToLocalStorage: boolean;
}>(ActionType.changeUserExpandedWidth);

export const changeUserSectionWidthsAction = createAction<{
  /**
   * Width of the left section
   */
  left: number;
  /**
   * Width of the right section
   */
  right: number;
  /**
   * Used in the redux middleware to decide if the value needs to be saved to local storage.
   */
  savedToLocalStorage: boolean;
}>(ActionType.changeUserSectionWidths);

export const resetAllUserChangedWidthsAction = createAction(ActionType.resetAllUserWidths);
