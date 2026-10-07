/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { JsonTab as SharedJsonTab } from '../../../shared/components/json_tab';
import { PREFIX } from '../../../../flyout/shared/test_ids';

export interface JsonTabProps {
  /**
   * The document to render as JSON
   */
  hit: DataTableRecord;
  /**
   * Whether the flyout is opened in rule preview. Drives the height offset of the
   * JsonCodeEditor (rule preview has no footer).
   */
  isRulePreview?: boolean;
}

/**
 * Json view displayed in the document details flyout
 */
export const JsonTab = memo(({ hit, isRulePreview = false }: JsonTabProps) => (
  <SharedJsonTab
    value={hit.raw as unknown as Record<string, unknown>}
    showFooterOffset={isRulePreview}
    data-test-subj={PREFIX}
  />
));

JsonTab.displayName = 'JsonTab';
