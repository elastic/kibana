/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useGetUrlParams, useUrlParams } from '../../../../hooks';
import {
  getClearedMonitorFilterParams,
  hasActiveMonitorFilters,
} from '../../../../utils/filters/clear_monitor_filter_params';

export function ClearAllFilters() {
  const urlParams = useGetUrlParams();
  const [, updateUrlParams] = useUrlParams();

  if (!hasActiveMonitorFilters(urlParams)) {
    return null;
  }

  return (
    <EuiFlexItem grow={false}>
      <EuiButtonEmpty
        data-test-subj="syntheticsClearAllFiltersButton"
        iconType="cross"
        size="s"
        onClick={() => updateUrlParams(getClearedMonitorFilterParams())}
        aria-label={CLEAR_ALL_FILTERS_ARIA_LABEL}
      >
        {CLEAR_ALL_FILTERS_LABEL}
      </EuiButtonEmpty>
    </EuiFlexItem>
  );
}

const CLEAR_ALL_FILTERS_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.filter.clearAllLabel',
  {
    defaultMessage: 'Clear all filters',
  }
);

const CLEAR_ALL_FILTERS_ARIA_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.filter.clearAllAriaLabel',
  {
    defaultMessage: 'Clear all selected Synthetics filters',
  }
);
