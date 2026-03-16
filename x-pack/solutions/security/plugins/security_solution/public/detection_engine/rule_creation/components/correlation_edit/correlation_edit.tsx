/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiCodeBlock,
  EuiCallOut,
} from '@elastic/eui';
import type { FieldHook } from '../../../../shared_imports';
import { UseMultiFields, UseField, SelectField, Field } from '../../../../shared_imports';
import { ScheduleItemField } from '../schedule_item_field';
import {
  CORRELATION_TYPE_CONFIG,
  CORRELATION_RULES_CONFIG,
  CORRELATION_GROUP_BY_CONFIG,
  CORRELATION_TIMESPAN_CONFIG,
  CORRELATION_CONDITION_OPERATOR_CONFIG,
  CORRELATION_CONDITION_VALUE_CONFIG,
  CORRELATION_CONDITION_FIELD_CONFIG,
} from './field_configs';
import * as i18n from './translations';

const CORRELATION_TYPE_OPTIONS = [
  { value: 'temporal', text: 'Temporal' },
  { value: 'temporal_ordered', text: 'Temporal Ordered' },
  { value: 'event_count', text: 'Event Count' },
  { value: 'value_count', text: 'Value Count' },
];

const CONDITION_OPERATOR_OPTIONS = [
  { value: 'eq', text: '=' },
  { value: 'neq', text: '≠' },
  { value: 'gt', text: '>' },
  { value: 'gte', text: '≥' },
  { value: 'lt', text: '<' },
  { value: 'lte', text: '≤' },
];

const TIMESPAN_COMPONENT_PROPS = {
  idAria: 'correlationTimespan',
  dataTestSubj: 'correlationTimespan',
  units: ['m', 'h', 'd'],
  minValue: 0,
};

interface CorrelationEditProps {
  path: string;
}

export function CorrelationEdit({ path }: CorrelationEditProps): JSX.Element {
  const showConditionSection = useCallback(
    (correlationType: string) =>
      correlationType === 'event_count' || correlationType === 'value_count',
    []
  );

  const showConditionField = useCallback(
    (correlationType: string) => correlationType === 'value_count',
    []
  );

  const CorrelationFields = useCallback(
    ({
      correlationType,
      correlationRules,
      correlationGroupBy,
      correlationConditionOperator,
      correlationConditionValue,
      correlationConditionField,
    }: Record<string, FieldHook>) => {
      const typeValue = correlationType.value as string;
      const hasCondition = showConditionSection(typeValue);
      const hasConditionField = showConditionField(typeValue);

      return (
        <>
          <EuiFormRow
            label={i18n.CORRELATION_TYPE_LABEL}
            helpText={i18n.CORRELATION_TYPE_HELP_TEXT}
            fullWidth
          >
            <SelectField
              field={correlationType}
              euiFieldProps={{
                options: CORRELATION_TYPE_OPTIONS,
                fullWidth: true,
                'data-test-subj': 'correlationType',
              }}
            />
          </EuiFormRow>
          <EuiSpacer size="m" />

          <EuiFormRow
            label={i18n.CORRELATION_RULES_LABEL}
            helpText={i18n.CORRELATION_RULES_HELP_TEXT}
            fullWidth
          >
            <Field
              field={correlationRules}
              euiFieldProps={{
                fullWidth: true,
                noSuggestions: false,
                placeholder: 'Enter rule IDs',
                'data-test-subj': 'correlationRules',
              }}
            />
          </EuiFormRow>
          <EuiSpacer size="m" />

          <EuiFormRow
            label={i18n.CORRELATION_GROUP_BY_LABEL}
            helpText={i18n.CORRELATION_GROUP_BY_HELP_TEXT}
            fullWidth
          >
            <Field
              field={correlationGroupBy}
              euiFieldProps={{
                fullWidth: true,
                noSuggestions: false,
                placeholder: 'host.name, user.name',
                'data-test-subj': 'correlationGroupBy',
              }}
            />
          </EuiFormRow>
          <EuiSpacer size="m" />

          {hasCondition && (
            <>
              <EuiFlexGroup gutterSize="s" alignItems="flexEnd">
                <EuiFlexItem grow={2}>
                  <EuiFormRow
                    label={i18n.CORRELATION_CONDITION_OPERATOR_LABEL}
                    helpText={i18n.CORRELATION_CONDITION_OPERATOR_HELP_TEXT}
                  >
                    <SelectField
                      field={correlationConditionOperator}
                      euiFieldProps={{
                        options: CONDITION_OPERATOR_OPTIONS,
                        'data-test-subj': 'correlationConditionOperator',
                      }}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem grow={1}>
                  <EuiFormRow
                    label={i18n.CORRELATION_CONDITION_VALUE_LABEL}
                    helpText={i18n.CORRELATION_CONDITION_VALUE_HELP_TEXT}
                  >
                    <Field
                      field={correlationConditionValue}
                      euiFieldProps={{
                        type: 'number',
                        min: 1,
                        'data-test-subj': 'correlationConditionValue',
                      }}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                {hasConditionField && (
                  <EuiFlexItem grow={2}>
                    <EuiFormRow
                      label={i18n.CORRELATION_CONDITION_FIELD_LABEL}
                      helpText={i18n.CORRELATION_CONDITION_FIELD_HELP_TEXT}
                    >
                      <Field
                        field={correlationConditionField}
                        euiFieldProps={{
                          'data-test-subj': 'correlationConditionField',
                        }}
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
              <EuiSpacer size="m" />
            </>
          )}

          <EuiSpacer size="m" />
          <EuiFormRow
            label={i18n.CORRELATION_ESQL_PREVIEW_LABEL}
            helpText={i18n.CORRELATION_ESQL_PREVIEW_HELP_TEXT}
            fullWidth
          >
            <EuiCodeBlock language="esql" fontSize="s" paddingSize="m" isCopyable>
              {i18n.CORRELATION_ESQL_PREVIEW_PLACEHOLDER}
            </EuiCodeBlock>
          </EuiFormRow>
          <EuiSpacer size="s" />
          <EuiCallOut size="s" color="primary" title={i18n.CORRELATION_ESQL_PREVIEW_PLACEHOLDER} />
        </>
      );
    },
    [showConditionSection, showConditionField]
  );

  const conditionOperatorConfig = useMemo(() => CORRELATION_CONDITION_OPERATOR_CONFIG, []);

  const conditionValueConfig = useMemo(() => CORRELATION_CONDITION_VALUE_CONFIG, []);

  const conditionFieldConfig = useMemo(() => CORRELATION_CONDITION_FIELD_CONFIG, []);

  return (
    <>
      <UseMultiFields
        fields={{
          correlationType: {
            path: `${path}.type`,
            config: CORRELATION_TYPE_CONFIG,
          },
          correlationRules: {
            path: `${path}.rules`,
            config: CORRELATION_RULES_CONFIG,
          },
          correlationGroupBy: {
            path: `${path}.groupBy`,
            config: CORRELATION_GROUP_BY_CONFIG,
          },
          correlationConditionOperator: {
            path: `${path}.condition.operator`,
            config: conditionOperatorConfig,
          },
          correlationConditionValue: {
            path: `${path}.condition.value`,
            config: conditionValueConfig,
          },
          correlationConditionField: {
            path: `${path}.condition.field`,
            config: conditionFieldConfig,
          },
        }}
      >
        {CorrelationFields}
      </UseMultiFields>
      <UseField
        path={`${path}.timespan`}
        config={CORRELATION_TIMESPAN_CONFIG}
        component={ScheduleItemField}
        componentProps={TIMESPAN_COMPONENT_PROPS}
      />
    </>
  );
}
