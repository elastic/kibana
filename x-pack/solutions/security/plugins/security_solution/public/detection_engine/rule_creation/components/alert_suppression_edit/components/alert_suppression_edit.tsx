/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiPanel, EuiText, EuiToolTip } from '@elastic/eui';
import type { DataViewFieldBase } from '@kbn/es-query';
import { useFormData } from '../../../../../shared_imports';
import { MissingFieldsStrategySelector } from './missing_fields_strategy_selector';
import { SuppressionDurationSelector } from './suppression_duration_selector';
import { SuppressionFieldsSelector } from './suppression_fields_selector';
import { ALERT_SUPPRESSION_FIELDS_FIELD_NAME } from '../constants/fields';

interface AlertSuppressionEditProps {
  suppressibleFields: DataViewFieldBase[];
  labelAppend?: React.ReactNode;
  disabled?: boolean;
  disabledText?: string;
  warningText?: string;
}

export const AlertSuppressionEdit = memo(function AlertSuppressionEdit({
  suppressibleFields,
  labelAppend,
  disabled,
  disabledText,
  warningText,
}: AlertSuppressionEditProps): JSX.Element {
  const [{ [ALERT_SUPPRESSION_FIELDS_FIELD_NAME]: suppressionFields }] = useFormData<{
    [ALERT_SUPPRESSION_FIELDS_FIELD_NAME]: string[];
  }>({
    watch: ALERT_SUPPRESSION_FIELDS_FIELD_NAME,
  });
  const hasSelectedFields = suppressionFields?.length > 0;
  const content = (
    <>
      <SuppressionFieldsSelector
        suppressibleFields={suppressibleFields}
        labelAppend={labelAppend}
        disabled={disabled}
      />
      {warningText && (
        <EuiText size="xs" color="warning" data-test-subj="alertSuppressionWarning">
          {warningText}
        </EuiText>
      )}
      <EuiPanel paddingSize="m" hasShadow={false}>
        <SuppressionDurationSelector disabled={disabled || !hasSelectedFields} />
        <MissingFieldsStrategySelector disabled={disabled || !hasSelectedFields} />
      </EuiPanel>
    </>
  );

  return (
    <EuiToolTip position="right" content={disabled && disabledText}>
      {content}
    </EuiToolTip>
  );
});
