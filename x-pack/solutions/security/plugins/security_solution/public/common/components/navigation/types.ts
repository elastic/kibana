/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityPageName } from '../../../app/types';

export type UrlStateType =
  | 'administration'
  | 'alerts'
  | 'cases'
  | 'detection_response'
  | 'exceptions'
  | 'get_started'
  | 'host'
  | 'users'
  | 'network'
  | 'kubernetes'
  | 'overview'
  | 'rules'
  | 'timeline'
  | 'explore'
  | 'dashboards'
  | 'indicators'
  | 'cloud_defend'
  | 'cloud_posture'
  | 'findings'
  | 'entity_analytics'
  | 'data_quality'
  | 'coverage_overview';

export interface NavTab {
  id: string;
  name: string;
  href: string;
  disabled: boolean;
  urlKey?: UrlStateType;
  pageId?: SecurityPageName;
  isBeta?: boolean;
  betaOptions?: {
    text: string;
  };
}
