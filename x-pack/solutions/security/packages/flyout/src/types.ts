/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { CSSProperties } from 'react';
import type { EuiFlyoutSize } from '@elastic/eui/src/components/flyout/const';

export interface FlyoutApi {
  /**
   * Open the flyout with main and child
   */
  openFlyout: (
    panels: { main?: FlyoutPanelProps; child?: FlyoutPanelProps },
    ui?: {
      mainSize: EuiFlyoutSize | CSSProperties['width'];
      childSize?: EuiFlyoutSize | CSSProperties['width'];
    }
  ) => void;
  /**
   * Replaces the current main panel with a new one
   */
  openMainPanel: (
    panel: FlyoutPanelProps,
    mainSize?: EuiFlyoutSize | CSSProperties['width']
  ) => void;
  /**
   * Replaces the current child panel with a new one
   */
  openChildPanel: (
    panel: FlyoutPanelProps,
    childSize?: EuiFlyoutSize | CSSProperties['width']
  ) => void;
  /**
   * Closes child panel
   */
  closeChildPanel: () => void;
  /**
   * Close all panels and closes flyout
   */
  closeFlyout: () => void;
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
  path?: string;
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

export interface FlyoutProps {
  /**
   * List of all registered panels available for render
   */
  registeredPanels: Panel[];
}
