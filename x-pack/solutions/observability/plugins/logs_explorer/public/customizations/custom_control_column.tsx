/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDegradedDocsControl, createStacktraceControl } from '@kbn/discover-utils';
import { type UnifiedDataTableProps } from '@kbn/unified-data-table';

export const getRowAdditionalControlColumns =
  (): UnifiedDataTableProps['rowAdditionalLeadingControls'] => {
    return [createDegradedDocsControl(), createStacktraceControl()];
  };
