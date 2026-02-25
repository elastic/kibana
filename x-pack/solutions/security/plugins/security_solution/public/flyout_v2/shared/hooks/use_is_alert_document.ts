/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type DataTableRecord, getFieldValue } from '@kbn/discover-utils';
import { useMemo } from 'react';

export const useIsAlertDocument = (hit: DataTableRecord): boolean =>
  useMemo(() => (getFieldValue(hit, 'event.kind') as string) === 'signal', [hit]);
