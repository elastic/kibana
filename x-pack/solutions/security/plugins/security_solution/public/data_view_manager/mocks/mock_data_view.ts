/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-plugin/common';
import type { FieldFormatsStartCommon } from '@kbn/field-formats-plugin/common';
import { DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID } from '../constants';

export const getMockDataView = () =>
  new DataView({
    spec: { id: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID },
    fieldFormats: {} as unknown as FieldFormatsStartCommon,
  });
