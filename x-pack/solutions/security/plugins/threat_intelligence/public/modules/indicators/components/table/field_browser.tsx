/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { VFC } from 'react';
import { BrowserField } from '@kbn/rule-registry-plugin/common';
import { FieldBrowser } from '@kbn/response-ops-alerts-fields-browser';

export interface IndicatorsFieldBrowserProps {
  browserFields: Readonly<Record<string, Partial<BrowserField>>>;
  columnIds: string[];
  onResetColumns: () => void;
  onToggleColumn: (columnId: string) => void;
}

export const IndicatorsFieldBrowser: VFC<IndicatorsFieldBrowserProps> = ({
  browserFields,
  columnIds,
  onResetColumns,
  onToggleColumn,
}) => {
  return (
    <FieldBrowser
      browserFields={browserFields}
      columnIds={columnIds}
      onResetColumns={onResetColumns}
      onToggleColumn={onToggleColumn}
      options={{
        preselectedCategoryIds: ['threat', 'base', 'event', 'agent'],
      }}
    />
  );
};
