/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import type { Indicator } from '../../../../../../common/threat_intelligence/types/indicator';
import { IndicatorEmptyPrompt } from './empty_prompt';
import { IndicatorFieldsTable } from './fields_table';
import { FLYOUT_TABLE_TEST_ID } from './test_ids';

export interface IndicatorsFlyoutTableProps {
  /**
   * Indicator to display in table view.
   */
  indicator: Indicator;
}

/**
 * Displays all the properties and values of an {@link Indicator} in table view,
 * using the {@link EuiInMemoryTable} from the @elastic/eui library.
 */
export const IndicatorsFlyoutTable: FC<IndicatorsFlyoutTableProps> = ({ indicator }) => {
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
};
