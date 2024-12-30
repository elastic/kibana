/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HealthStatus } from '@elastic/elasticsearch/lib/api/types';

import { IconColor } from '@elastic/eui';

type HealthStatusStrings = 'red' | 'green' | 'yellow' | 'unavailable';
export const healthColorsMap: Record<HealthStatusStrings, IconColor> = {
  red: 'danger',
  green: 'success',
  yellow: 'warning',
  unavailable: '',
};

export const healthColorsMapSelectable = {
  red: 'danger',
  RED: 'danger',
  green: 'success',
  GREEN: 'success',
  yellow: 'warning',
  YELLOW: 'warning',
};

export const indexHealthToHealthColor = (health?: HealthStatus | 'unavailable'): IconColor => {
  if (!health) return '';
  return healthColorsMap[health.toLowerCase() as HealthStatusStrings] ?? '';
};
