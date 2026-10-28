/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProjectRoutingAccess } from '@kbn/cps-utils';

/**
 * Settings / CRUD routes stay origin-only: monitor configs, Fleet, and the
 * Synthetics service cannot act on linked projects.
 */
const ORIGIN_ONLY_PATH_MARKERS = [
  '/add-monitor',
  '/edit-monitor',
  '/settings',
  '/manage-monitors',
] as const;

export const getSyntheticsProjectPickerAccess = (location: string): ProjectRoutingAccess => {
  if (ORIGIN_ONLY_PATH_MARKERS.some((marker) => location.includes(marker))) {
    return ProjectRoutingAccess.DISABLED;
  }
  return ProjectRoutingAccess.EDITABLE;
};
