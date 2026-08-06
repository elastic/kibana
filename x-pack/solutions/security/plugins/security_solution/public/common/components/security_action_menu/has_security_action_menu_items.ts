/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityActionMenuContribution } from './types';

export const hasSecurityActionMenuItems = (
  contributions: readonly SecurityActionMenuContribution[],
  customActions: readonly SecurityActionMenuContribution[] = []
): boolean =>
  contributions.some(({ items }) => items.length > 0) ||
  customActions.some(({ items }) => items.length > 0);
