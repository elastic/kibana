/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFilterGroup } from '@elastic/eui';
import { MultiselectFilter } from '../../../../common/components/multiselect_filter';
import * as i18n from './translations';
import type { GapStatus } from '../../types';
import { getStatusLabel } from './utils';

interface GapStatusFilterComponent {
  selectedItems: GapStatus[];
  onChange: (selectedItems: GapStatusItem[]) => void;
}

const items: GapStatus[] = ['partially_filled', 'unfilled', 'filled'];

const GapStatusFilterComponent: React.FC<GapStatusFilterComponent> = ({
  selectedItems,
  onChange,
}) => {
  const renderItem = useCallback((status: GapStatus) => {
    return getStatusLabel(status);
  }, []);

  const handleSelectionChange = useCallback(
    (statuses: GapStatus[]) => {
      console.log('statuses', statuses);
      onChange(statuses);
    },
    [onChange]
  );

  return (
    <EuiFilterGroup>
      <MultiselectFilter<GapStatus>
        data-test-subj="GapStatusTypeFilter"
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

export const GapStatusFilter = React.memo(GapStatusFilterComponent);
GapStatusFilter.displayName = 'GapStatusFilter';
