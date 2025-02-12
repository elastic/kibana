/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

export interface ExpandableFlyoutApi {
  /**
   * Open the flyout with left, right and/or preview panels
   */
  openFlyout: (panels: {
    left?: FlyoutPanelProps;
    right?: FlyoutPanelProps;
    preview?: FlyoutPanelProps;
  }) => void;
  /**
   * Replaces the current right panel with a new one
   */
  openRightPanel: (panel: FlyoutPanelProps) => void;
  /**
   * Replaces the current left panel with a new one
   */
  openLeftPanel: (panel: FlyoutPanelProps) => void;
  /**
   * Add a new preview panel to the list of current preview panels
   */
  openPreviewPanel: (panel: FlyoutPanelProps) => void;
  /**
   * Closes right panel
   */
  closeRightPanel: () => void;
  /**
   * Closes left panel
   */
  closeLeftPanel: () => void;
  /**
   * Closes all preview panels
   */
  closePreviewPanel: () => void;
  /**
   * Go back to previous preview panel
   */
  previousPreviewPanel: () => void;
  /**
   * Close all panels and closes flyout
   */
  closeFlyout: () => void;
}

export interface PanelPath {
  /**
   * Top level tab that to be displayed
   */
  tab: string;
  /**
   * Optional secondary level to be displayed under top level tab
   */
  subTab?: string;
}

export interface FlyoutPanelProps {
  /**
   * Unique key to identify the panel
   */
  id: string;
  /**
   * Any parameters necessary for the initial requests within the flyout
   */
  params?: Record<string, unknown>;
  /**
   * Tracks the path for what to show in a panel, such as activated tab and subtab
   */
  path?: PanelPath;
}

export interface Panel {
  /**
   * Unique key used to identify the panel
   */
  key?: string;
  /**
   * Component to be rendered
   */
  component: (props: FlyoutPanelProps) => React.ReactElement;
}
