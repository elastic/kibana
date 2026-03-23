/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindMaintenanceWindowsResult } from '@kbn/maintenance-windows-plugin/common';
import { createAsyncAction } from '../utils/actions';

export const getMaintenanceWindowsAction = createAsyncAction<void, FindMaintenanceWindowsResult>(
  'GET MAINTENANCE WINDOWS'
);
