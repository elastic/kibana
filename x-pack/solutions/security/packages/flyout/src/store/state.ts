/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiFlyoutSize } from '@elastic/eui/src/components/flyout/const';
import type { CSSProperties } from 'react';
import type { FlyoutPanelProps } from '../types';

export interface PanelsState {
  /**
   * Panel to render in the child section
   */
  child: FlyoutPanelProps | undefined;
  /**
   * Panel to render in the main section
   */
  main: FlyoutPanelProps | undefined;
}

export const initialPanelsState: PanelsState = {
  child: undefined,
  main: undefined,
};

export interface UiState {
  /**
   * Push vs overlay information
   */
  pushVsOverlay: 'push' | 'overlay';
  /**
   *
   */
  mainSize: EuiFlyoutSize | CSSProperties['width'];
  /**
   *
   */
  childSize: EuiFlyoutSize | CSSProperties['width'];
  /**
   *
   */
  hasChildBackground: boolean;
}

export const initialUiState: UiState = {
  pushVsOverlay: 'overlay',
  mainSize: 's',
  childSize: 's',
  hasChildBackground: false,
};

export interface State {
  /**
   * All panels related information
   */
  panels: PanelsState;
  /**
   * All ui related information
   */
  ui: UiState;
}

export const initialState: State = {
  panels: initialPanelsState,
  ui: initialUiState,
};
