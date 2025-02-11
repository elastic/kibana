/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiRange, EuiFormRow } from '@elastic/eui';
import type { EuiRangeProps } from '@elastic/eui';

import type { FieldHook } from '../../../../shared_imports';

interface AnomalyThresholdSliderProps {
  describedByIds: string[];
  field: FieldHook;
}

export const AnomalyThresholdSlider = ({
  describedByIds = [],
  field,
}: AnomalyThresholdSliderProps) => {
  const threshold = field.value as number;
  const onThresholdChange = useCallback<NonNullable<EuiRangeProps['onChange']>>(
    (event) => {
      const thresholdValue = Number(event.currentTarget.value);
      field.setValue(thresholdValue);
    },
    [field]
  );

  return (
    <EuiFormRow
      label={field.label}
      data-test-subj="anomalyThresholdSlider"
      describedByIds={describedByIds}
    >
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiRange
            value={threshold}
            onChange={onThresholdChange}
            fullWidth
            showInput
            showRange
            showTicks
            tickInterval={25}
            min={0}
            max={100}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};
