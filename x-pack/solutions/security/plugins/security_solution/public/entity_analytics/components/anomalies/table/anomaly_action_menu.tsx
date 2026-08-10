/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenu } from '@elastic/eui';
import React, { useMemo } from 'react';
import type { AnomalyTableRowAction } from '../../../api/hooks/use_anomaly_table_row_actions';
import { ANOMALIES_TABLE_ROW_ACTION_TEST_ID_PREFIX } from '../test_ids';

interface AnomalyActionMenuProps {
  actions: AnomalyTableRowAction[];
}

export const AnomalyActionMenu = ({ actions }: AnomalyActionMenuProps) => {
  const items = useMemo(
    () =>
      actions.map((action) => ({
        key: action.key,
        name: action.label,
        icon: action.icon,
        onClick: action.onClick,
        'data-test-subj': `${ANOMALIES_TABLE_ROW_ACTION_TEST_ID_PREFIX}${action.key}`,
      })),
    [actions]
  );

  return <EuiContextMenu initialPanelId={0} panels={[{ id: 0, items }]} />;
};
