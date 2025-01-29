/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const STATUS_TO_COLOR_MAP: Record<string, string> = {
  open: 'primary',
  acknowledged: 'warning',
  closed: 'default',
};

export const getBadgeColorFromAlertStatus = (status: string | undefined) =>
  STATUS_TO_COLOR_MAP[status || 'closed'];
