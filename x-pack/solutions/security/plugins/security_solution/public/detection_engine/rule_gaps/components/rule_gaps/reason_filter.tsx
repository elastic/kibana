/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFilterGroup } from '@elastic/eui';
import { gapReasonType } from '@kbn/alerting-plugin/common';
import { MultiselectFilter } from '../../../../common/components/multiselect_filter';
import * as i18n from './translations';
import type { GapReasonType } from '../../types';
import { getReasonLabel } from './utils';

interface GapReasonFilterComponent {
  selectedItems: GapReasonType[];
  onChange: (selectedItems: GapReasonType[]) => void;
}

export const GAP_REASON_FILTER_ITEMS: GapReasonType[] = [
  gapReasonType.RULE_DISABLED,
  gapReasonType.RULE_DID_NOT_RUN,
];

export const GapReasonFilter = ({ selectedItems, onChange }: GapReasonFilterComponent) => {
  const renderItem = useCallback((reasonType: GapReasonType) => getReasonLabel(reasonType), []);

  const handleSelectionChange = useCallback(
    (reasonTypes: GapReasonType[]) => {
      onChange(reasonTypes);
    },
    [onChange]
  );

  return (
    <EuiFilterGroup>
      <MultiselectFilter<GapReasonType>
        data-test-subj="rule-gaps-reason-filter"
        title={i18n.GAP_REASON_FILTER_TITLE}
        items={GAP_REASON_FILTER_ITEMS}
        selectedItems={selectedItems}
        onSelectionChange={handleSelectionChange}
        renderItem={renderItem}
        width={220}
      />
    </EuiFilterGroup>
  );
};
