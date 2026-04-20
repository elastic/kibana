/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NavTab } from '../types';

export interface TabNavigationProps {
  navTabs: Record<string, NavTab>;
  /** Forwarded to `EuiTabs`; set false when an ancestor provides the tab row border. */
  tabsBottomBorder?: boolean;
}

export interface TabNavigationItemProps {
  hrefWithSearch: string;
  id: string;
  disabled: boolean;
  name: string;
  isSelected: boolean;
  isBeta?: boolean;
  betaOptions?: {
    text: string;
  };
}
