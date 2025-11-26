/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { useIOCDetailsContext } from '../context';
import { IndicatorEmptyPrompt } from '../components/empty_prompt';
import { IndicatorFieldsTable } from '../components/fields_table';

export const FLYOUT_TABLE_TEST_ID = 'tiFlyoutTable';

/**
 * Table view displayed in the document details expandable flyout right section
 */
export const TableTab = memo(() => {
  const { indicator } = useIOCDetailsContext();
  const items: string[] = Object.keys(indicator.fields);

  return items.length === 0 ? (
    <IndicatorEmptyPrompt />
  ) : (
    <IndicatorFieldsTable
      data-test-subj={FLYOUT_TABLE_TEST_ID}
      fields={items}
      indicator={indicator}
    />
  );
});

TableTab.displayName = 'TableTab';
