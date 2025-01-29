/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { UiCounterMetricType } from '@kbn/analytics';
import type { IconType } from '@elastic/eui';
import type { LinkCategories } from '@kbn/security-solution-navigation';

export enum SolutionSideNavItemPosition {
  top = 'top',
  bottom = 'bottom',
}

export interface SolutionSideNavItem<T extends string = string> {
  id: T;
  label: string;
  href: string;
  onClick?: React.MouseEventHandler;
  openInNewTab?: boolean;
  description?: string;
  items?: Array<SolutionSideNavItem<T>>;
  categories?: LinkCategories<T>;
  iconType?: IconType;
  appendSeparator?: boolean;
  position?: SolutionSideNavItemPosition;
  disabled?: boolean;
  isBeta?: boolean;
  betaOptions?: {
    text: string;
  };
}

export type Tracker = (
  type: UiCounterMetricType,
  event: string | string[],
  count?: number | undefined
) => void;
