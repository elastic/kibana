/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';

import type { DataTableRecord } from '@kbn/discover-utils';
import { JsonTab as SharedJsonTab } from '../../../../flyout/shared/components/json_tab';
import { JSON_TAB_TEST_ID } from '../constants/test_ids';

export interface JsonTabProps {
  /**
   * The attack-discovery document hit. Renders `hit.raw` (the underlying
   * `SearchHit`) as pretty-printed JSON.
   */
  hit: DataTableRecord;
}

/**
 * Json view displayed in the attack details expandable flyout
 */
export const JsonTab = memo(({ hit }: JsonTabProps) => {
  return (
    <SharedJsonTab
      value={hit.raw as unknown as Record<string, unknown>}
      showFooterOffset={false}
      data-test-subj={JSON_TAB_TEST_ID}
    />
  );
});

JsonTab.displayName = 'JsonTab';
