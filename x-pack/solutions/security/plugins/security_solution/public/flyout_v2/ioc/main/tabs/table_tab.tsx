/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { FlyoutError } from '../../../shared/components/flyout_error';
import type { Indicator } from '../../../../../common/threat_intelligence/types/indicator';
import type { CellActionRenderer } from '../../../shared/components/cell_actions';
import { IndicatorFieldsTable } from '../components/fields_table';

export const FLYOUT_TABLE_TEST_ID = 'tiFlyoutTable';

export interface TableTabProps {
  /**
   * The indicator document
   */
  indicator: Indicator;
  /**
   * Renderer for cell actions
   */
  renderCellActions: CellActionRenderer;
}

/**
 * Table view displayed in the document details expandable flyout right section
 */
export const TableTab = memo(({ indicator, renderCellActions }: TableTabProps) => {
  const items: string[] = Object.keys(indicator.fields);

  return items.length === 0 ? (
    <FlyoutError />
  ) : (
    <IndicatorFieldsTable
      data-test-subj={FLYOUT_TABLE_TEST_ID}
      fields={items}
      indicator={indicator}
      renderCellActions={renderCellActions}
    />
  );
});

TableTab.displayName = 'TableTab';
