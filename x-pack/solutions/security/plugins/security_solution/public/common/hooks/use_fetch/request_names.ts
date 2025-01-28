/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { APP_UI_ID } from '../../../../common/constants';

export const REQUEST_NAMES = {
  SECURITY_DASHBOARDS: `${APP_UI_ID} fetch security dashboards`,
  SECURITY_TAGS: `${APP_UI_ID} fetch security tags`,
  SECURITY_CREATE_TAG: `${APP_UI_ID} fetch security create tag`,
  CTI_TAGS: `${APP_UI_ID} fetch cti tags`,
  ANOMALIES_TABLE: `${APP_UI_ID} fetch anomalies table data`,
} as const;

export type RequestName = (typeof REQUEST_NAMES)[keyof typeof REQUEST_NAMES];
