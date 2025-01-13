/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiFormRowProps, EuiRadioGroupOption, EuiRadioGroupProps } from '@elastic/eui';
import { RadioGroupField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { AlertSuppressionMissingFieldsStrategyEnum } from '../../../../../../common/api/detection_engine';
import { UseField } from '../../../../../shared_imports';
import { SuppressionInfoIcon } from './suppression_info_icon';
import { ALERT_SUPPRESSION_MISSING_FIELDS_FIELD_NAME } from '../constants/fields';
import * as i18n from './translations';

interface MissingFieldsStrategySelectorProps {
  disabled?: boolean;
}

export function MissingFieldsStrategySelector({
  disabled,
}: MissingFieldsStrategySelectorProps): JSX.Element {
  const radioFieldProps: Partial<EuiRadioGroupProps> = useMemo(
    () => ({
      options: ALERT_SUPPRESSION_MISSING_FIELDS_STRATEGY_OPTIONS,
      'data-test-subj': 'suppressionMissingFieldsOptions',
      disabled,
    }),
    [disabled]
  );

  return (
    <UseField
      path={ALERT_SUPPRESSION_MISSING_FIELDS_FIELD_NAME}
      component={RadioGroupField}
      componentProps={EUI_FORM_ROW_PROPS}
      euiFieldProps={radioFieldProps}
    />
  );
}

const EUI_FORM_ROW_PROPS: Partial<EuiFormRowProps> = {
  label: (
    <span>
      {i18n.ALERT_SUPPRESSION_MISSING_FIELDS_LABEL} <SuppressionInfoIcon />
    </span>
  ),
  'data-test-subj': 'alertSuppressionMissingFields',
};

const ALERT_SUPPRESSION_MISSING_FIELDS_STRATEGY_OPTIONS: EuiRadioGroupOption[] = [
  {
    id: AlertSuppressionMissingFieldsStrategyEnum.suppress,
    label: i18n.ALERT_SUPPRESSION_MISSING_FIELDS_SUPPRESS_OPTION,
  },
  {
    id: AlertSuppressionMissingFieldsStrategyEnum.doNotSuppress,
    label: i18n.ALERT_SUPPRESSION_MISSING_FIELDS_DO_NOT_SUPPRESS_OPTION,
  },
];
