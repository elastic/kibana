/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFilterGroup } from '@elastic/eui';
import { gapStatus } from '@kbn/alerting-plugin/common';
import { MultiselectFilter } from '../../../../common/components/multiselect_filter';
import * as i18n from './translations';
import type { GapStatus } from '../../types';
import { getStatusLabel } from './utils';

interface GapStatusFilterComponent {
  selectedItems: GapStatus[];
  onChange: (selectedItems: GapStatus[]) => void;
}

const items: GapStatus[] = [gapStatus.UNFILLED, gapStatus.PARTIALLY_FILLED, gapStatus.FILLED];

export const GapStatusFilter = ({ selectedItems, onChange }: GapStatusFilterComponent) => {
  const renderItem = useCallback((status: GapStatus) => {
    return getStatusLabel(status);
  }, []);

  const handleSelectionChange = useCallback(
    (statuses: GapStatus[]) => {
      onChange(statuses);
    },
    [onChange]
  );

  return (
    <EuiFilterGroup>
      <MultiselectFilter<GapStatus>
        data-test-subj="rule-gaps-status-filter"
        title={i18n.GAP_STATUS_FILTER_TITLE}
        items={items}
        selectedItems={selectedItems}
        onSelectionChange={handleSelectionChange}
        renderItem={renderItem}
        width={200}
      />
    </EuiFilterGroup>
  );
};
