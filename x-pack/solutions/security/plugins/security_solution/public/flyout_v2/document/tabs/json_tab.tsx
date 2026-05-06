/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { JsonTab as SharedJsonTab } from '../../shared/tabs/json_tab';
import { PREFIX } from '../../../flyout/shared/test_ids';

export interface JsonTabProps {
  hit: DataTableRecord;
}

export const JsonTab = memo(({ hit }: JsonTabProps) => (
  <SharedJsonTab value={hit.raw as unknown as Record<string, unknown>} data-test-subj={PREFIX} />
));

JsonTab.displayName = 'JsonTab';
