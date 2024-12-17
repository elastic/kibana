/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect } from 'react';
import { EuiFormRow, EuiRadioGroup, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import type { FieldHook } from '../../../../../shared_imports';
import { UseMultiFields } from '../../../../../shared_imports';
import { AlertSuppressionDurationType } from '../../../../../detections/pages/detection_engine/rules/types';
import { DurationInput } from '../../duration_input';
import {
  ALERT_SUPPRESSION_DURATION_FIELD_NAME,
  ALERT_SUPPRESSION_DURATION_TYPE_FIELD_NAME,
  ALERT_SUPPRESSION_DURATION_UNIT_FIELD_NAME,
  ALERT_SUPPRESSION_DURATION_VALUE_FIELD_NAME,
} from '../constants/fields';
import * as i18n from './translations';

interface AlertSuppressionDurationProps {
  onlyPerTimePeriod?: boolean;
  onlyPerTimePeriodReasonMessage?: string;
  disabled?: boolean;
}

export function SuppressionDurationSelector({
  onlyPerTimePeriod,
  onlyPerTimePeriodReasonMessage,
  disabled,
}: AlertSuppressionDurationProps): JSX.Element {
  return (
    <EuiFormRow data-test-subj="alertSuppressionDuration">
      <UseMultiFields<{
        suppressionDurationSelector: string;
        suppressionDurationValue: number | undefined;
        suppressionDurationUnit: string;
      }>
        fields={{
          suppressionDurationSelector: {
            path: ALERT_SUPPRESSION_DURATION_TYPE_FIELD_NAME,
          },
          suppressionDurationValue: {
            path: `${ALERT_SUPPRESSION_DURATION_FIELD_NAME}.${ALERT_SUPPRESSION_DURATION_VALUE_FIELD_NAME}`,
          },
          suppressionDurationUnit: {
            path: `${ALERT_SUPPRESSION_DURATION_FIELD_NAME}.${ALERT_SUPPRESSION_DURATION_UNIT_FIELD_NAME}`,
          },
        }}
      >
        {({ suppressionDurationSelector, suppressionDurationValue, suppressionDurationUnit }) => (
          <SuppressionDurationSelectorFields
            suppressionDurationSelectorField={suppressionDurationSelector}
            suppressionDurationValueField={suppressionDurationValue}
            suppressionDurationUnitField={suppressionDurationUnit}
            onlyPerTimePeriod={onlyPerTimePeriod}
            onlyPerTimePeriodReasonMessage={onlyPerTimePeriodReasonMessage}
            disabled={disabled}
          />
        )}
      </UseMultiFields>
    </EuiFormRow>
  );
}

interface SuppressionDurationSelectorFieldsProps {
  suppressionDurationSelectorField: FieldHook<string, string>;
  suppressionDurationValueField: FieldHook<number | undefined, number | undefined>;
  suppressionDurationUnitField: FieldHook<string, string>;
  onlyPerTimePeriod?: boolean;
  onlyPerTimePeriodReasonMessage?: string;
  disabled?: boolean;
}

const SuppressionDurationSelectorFields = memo(function SuppressionDurationSelectorFields({
  suppressionDurationSelectorField,
  suppressionDurationValueField,
  suppressionDurationUnitField,
  onlyPerTimePeriod = false,
  onlyPerTimePeriodReasonMessage,
  disabled,
}: SuppressionDurationSelectorFieldsProps): JSX.Element {
  const { euiTheme } = useEuiTheme();
  const { value: durationType, setValue: setDurationType } = suppressionDurationSelectorField;

  useEffect(() => {
    if (onlyPerTimePeriod && durationType !== AlertSuppressionDurationType.PerTimePeriod) {
      setDurationType(AlertSuppressionDurationType.PerTimePeriod);
    }
  }, [onlyPerTimePeriod, durationType, setDurationType]);

  return (
    <>
      <EuiRadioGroup
        disabled={disabled}
        idSelected={suppressionDurationSelectorField.value}
        options={[
          {
            id: AlertSuppressionDurationType.PerRuleExecution,
            label: onlyPerTimePeriod ? (
              <EuiToolTip content={onlyPerTimePeriodReasonMessage}>
                <> {i18n.ALERT_SUPPRESSION_DURATION_PER_RULE_EXECUTION_OPTION}</>
              </EuiToolTip>
            ) : (
              i18n.ALERT_SUPPRESSION_DURATION_PER_RULE_EXECUTION_OPTION
            ),
            disabled: onlyPerTimePeriod ? true : disabled,
          },
          {
            id: AlertSuppressionDurationType.PerTimePeriod,
            disabled,
            label: i18n.ALERT_SUPPRESSION_DURATION_PER_TIME_PERIOD_OPTION,
          },
        ]}
        onChange={(id) => {
          suppressionDurationSelectorField.setValue(id);
        }}
        data-test-subj="alertSuppressionDurationOptions"
      />
      <div
        className={css`
          padding-left: ${euiTheme.size.l};
        `}
      >
        <DurationInput
          durationValueField={suppressionDurationValueField}
          durationUnitField={suppressionDurationUnitField}
          // Suppression duration is also disabled suppression by rule execution is selected in radio button
          isDisabled={
            disabled ||
            suppressionDurationSelectorField.value !== AlertSuppressionDurationType.PerTimePeriod
          }
          minimumValue={1}
        />
      </div>
    </>
  );
});
