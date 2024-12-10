/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext } from 'react';
import { UnifiedDataTableContext } from '@kbn/unified-data-table/src/table_context';
import * as i18n from './translations';

export const useTimelineUnifiedDataTableContext = () => {
  const ctx = useContext(UnifiedDataTableContext);

  if (!ctx) {
    throw new Error(i18n.TIMELINE_UNIFIED_DATA_TABLE_CONTEXT_ERROR);
  }

  return ctx;
};
