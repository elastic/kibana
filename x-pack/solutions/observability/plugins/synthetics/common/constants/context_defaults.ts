/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CursorDirection, SortOrder } from '../runtime_types';

/**
 * The Uptime UI utilizes a settings context, the defaults for which are stored here.
 */
export const CONTEXT_DEFAULTS = {
  /**
   * The application cannot assume a basePath.
   */
  BASE_PATH: '',

  CURSOR_PAGINATION: {
    cursorDirection: CursorDirection.AFTER,
    sortOrder: SortOrder.ASC,
  },
};
