/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { FilterChecked } from '@elastic/eui';
import { MultiselectFilter } from '../../../common/components/multiselect_filter';
import type { DriftSeverity } from '../../../../common/endpoint_assets';
import * as i18n from '../../pages/translations';

const DRIFT_SEVERITIES: DriftSeverity[] = ['critical', 'high', 'medium', 'low'];

interface DriftSeverityFilterProps {
  selectedSeverities: DriftSeverity[];
  onSelectionChange: (severities: DriftSeverity[]) => void;
}

const getSeverityLabel = (severity: DriftSeverity): string => {
  switch (severity) {
    case 'critical':
      return i18n.DRIFT_CRITICAL;
    case 'high':
      return i18n.DRIFT_HIGH;
    case 'medium':
      return i18n.DRIFT_SEVERITY_MEDIUM;
    case 'low':
      return i18n.DRIFT_SEVERITY_LOW;
    default:
      return severity;
  }
};

const DriftSeverityFilterComponent: React.FC<DriftSeverityFilterProps> = ({
  selectedSeverities,
  onSelectionChange,
}) => {
  const handleChange = useCallback(
    (newSelection: DriftSeverity[], _changedOption: DriftSeverity, _changedStatus: FilterChecked) => {
      onSelectionChange(newSelection);
    },
    [onSelectionChange]
  );

  return (
    <MultiselectFilter<DriftSeverity>
      data-test-subj="drift-severity-filter"
      title={i18n.DRIFT_COLUMN_SEVERITY}
      items={DRIFT_SEVERITIES}
      selectedItems={selectedSeverities}
      onSelectionChange={handleChange}
      renderItem={getSeverityLabel}
      renderLabel={getSeverityLabel}
      width={120}
    />
  );
};

export const DriftSeverityFilter = React.memo(DriftSeverityFilterComponent);
DriftSeverityFilter.displayName = 'DriftSeverityFilter';
