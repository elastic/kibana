/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiCodeBlock,
  EuiComboBox,
  EuiBadge,
  EuiFormHelpText,
} from '@elastic/eui';
import type { FieldHook } from '../../../../shared_imports';
import {
  UseMultiFields,
  UseField,
  SelectField,
  Field,
  useFormData,
} from '../../../../shared_imports';
import { ScheduleItemField } from '../schedule_item_field';
import {
  CORRELATION_TYPE_CONFIG,
  CORRELATION_RULES_CONFIG,
  CORRELATION_GROUP_BY_CONFIG,
  CORRELATION_TIMESPAN_CONFIG,
  CORRELATION_CONDITION_OPERATOR_CONFIG,
  CORRELATION_CONDITION_VALUE_CONFIG,
  CORRELATION_CONDITION_FIELD_CONFIG,
  CORRELATION_REMOTE_CLUSTERS_CONFIG,
  CORRELATION_TARGET_SPACES_CONFIG,
} from './field_configs';
import { CorrelationInfoIcon } from './correlation_info_icon';
import { useRemoteClusters } from './use_remote_clusters';
import { useCorrelationTypeRecommendation } from './use_correlation_type_recommendation';
import { CorrelationTypeRecommendationCallout } from './correlation_type_recommendation';
import * as i18n from './translations';

const CORRELATION_TYPE_OPTIONS = [
  { value: 'temporal', text: i18n.CORRELATION_TYPE_TEMPORAL },
  { value: 'temporal_ordered', text: i18n.CORRELATION_TYPE_TEMPORAL_ORDERED },
  { value: 'event_count', text: i18n.CORRELATION_TYPE_EVENT_COUNT },
  { value: 'value_count', text: i18n.CORRELATION_TYPE_VALUE_COUNT },
];

const CONDITION_OPERATOR_OPTIONS = [
  { value: 'eq', text: i18n.CONDITION_OPERATOR_EQ },
  { value: 'neq', text: i18n.CONDITION_OPERATOR_NEQ },
  { value: 'gt', text: i18n.CONDITION_OPERATOR_GT },
  { value: 'gte', text: i18n.CONDITION_OPERATOR_GTE },
  { value: 'lt', text: i18n.CONDITION_OPERATOR_LT },
  { value: 'lte', text: i18n.CONDITION_OPERATOR_LTE },
];

const TIMESPAN_COMPONENT_PROPS = {
  idAria: 'correlationTimespan',
  dataTestSubj: 'correlationTimespan',
  units: ['m', 'h', 'd'],
  minValue: 1,
};

const CORRELATION_TYPE_LABEL_WITH_ICON = (
  <>
    {i18n.CORRELATION_TYPE_LABEL} <CorrelationInfoIcon />
  </>
);

interface CorrelationEditProps {
  path: string;
}

export function CorrelationEdit({ path }: CorrelationEditProps): JSX.Element {
  const {
    clusters: remoteClusters,
    isLoading: remoteClustersLoading,
    error: remoteClustersError,
  } = useRemoteClusters();

  const [formData] = useFormData({
    watch: [`${path}.rules`, `${path}.groupBy`, `${path}.type`],
  });

  const nestedData = path
    .split('.')
    .reduce(
      (acc: Record<string, unknown> | undefined, key: string) =>
        (acc?.[key] ?? undefined) as Record<string, unknown> | undefined,
      formData as Record<string, unknown> | undefined
    );

  const selectedRules = (nestedData?.rules ?? []) as string[];
  const groupByFields = (nestedData?.groupBy ?? []) as string[];
  const currentTypeFromForm = (nestedData?.type ?? 'temporal') as string;

  const { recommendation, isLoading: isRecommendationLoading } = useCorrelationTypeRecommendation({
    selectedRules,
    groupByFields,
    currentType: currentTypeFromForm,
  });

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
      correlationRemoteClusters,
      correlationTargetSpaces,
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
            label={CORRELATION_TYPE_LABEL_WITH_ICON}
            helpText={i18n.CORRELATION_TYPE_HELP_TEXT}
            fullWidth
          >
            <SelectField
              field={correlationType}
              euiFieldProps={{
                options: CORRELATION_TYPE_OPTIONS,
                fullWidth: true,
                hasNoInitialSelection: false,
                'data-test-subj': 'correlationType',
              }}
            />
          </EuiFormRow>
          <EuiSpacer size="m" />

          {(recommendation || isRecommendationLoading) && (
            <CorrelationTypeRecommendationCallout
              recommendation={recommendation}
              currentType={typeValue}
              onApply={(type) => correlationType.setValue(type)}
              isLoading={isRecommendationLoading}
            />
          )}

          <Field
            field={correlationRules}
            euiFieldProps={{
              fullWidth: true,
              noSuggestions: false,
              placeholder: 'Enter rule IDs',
              'data-test-subj': 'correlationRules',
            }}
          />
          <EuiSpacer size="m" />

          <Field
            field={correlationGroupBy}
            euiFieldProps={{
              fullWidth: true,
              noSuggestions: false,
              placeholder: 'host.name, user.name',
              'data-test-subj': 'correlationGroupBy',
            }}
          />
          <EuiSpacer size="m" />

          <EuiFormRow
            label={i18n.CORRELATION_REMOTE_CLUSTERS_LABEL}
            helpText={i18n.CORRELATION_REMOTE_CLUSTERS_HELP_TEXT}
            fullWidth
          >
            <EuiComboBox
              placeholder={
                remoteClustersLoading
                  ? i18n.CORRELATION_REMOTE_CLUSTERS_LOADING
                  : i18n.CORRELATION_REMOTE_CLUSTERS_PLACEHOLDER
              }
              options={remoteClusters.map((c) => ({
                label: c.label,
                color: c.isConnected ? undefined : 'subdued',
                append: c.isConnected ? undefined : (
                  <EuiBadge color="hollow">
                    {i18n.CORRELATION_REMOTE_CLUSTERS_DISCONNECTED}
                  </EuiBadge>
                ),
              }))}
              selectedOptions={(correlationRemoteClusters.value as string[]).map((v: string) => ({
                label: v,
              }))}
              onChange={(selected) =>
                correlationRemoteClusters.setValue(selected.map((s) => s.label))
              }
              onCreateOption={(value) => {
                correlationRemoteClusters.setValue([
                  ...(correlationRemoteClusters.value as string[]),
                  value,
                ]);
              }}
              isLoading={remoteClustersLoading}
              isClearable
              fullWidth
              data-test-subj="correlationRemoteClusters"
            />
          </EuiFormRow>
          {remoteClustersError && (
            <EuiFormHelpText color="danger">{remoteClustersError}</EuiFormHelpText>
          )}
          <EuiSpacer size="m" />

          <EuiFormRow
            label={i18n.CORRELATION_TARGET_SPACES_LABEL}
            helpText={i18n.CORRELATION_TARGET_SPACES_HELP_TEXT}
            fullWidth
          >
            <EuiComboBox
              placeholder={i18n.CORRELATION_TARGET_SPACES_PLACEHOLDER}
              selectedOptions={(correlationTargetSpaces.value as string[]).map((v: string) => ({
                label: v,
              }))}
              onChange={(selected) =>
                correlationTargetSpaces.setValue(selected.map((s) => s.label))
              }
              onCreateOption={(value) => {
                correlationTargetSpaces.setValue([
                  ...(correlationTargetSpaces.value as string[]),
                  value,
                ]);
              }}
              isClearable
              fullWidth
              data-test-subj="correlationTargetSpaces"
            />
          </EuiFormRow>
          <EuiSpacer size="m" />

          {hasCondition && (
            <>
              <EuiFlexGroup gutterSize="s" alignItems="flexEnd">
                <EuiFlexItem grow={2}>
                  <SelectField
                    field={correlationConditionOperator}
                    euiFieldProps={{
                      options: CONDITION_OPERATOR_OPTIONS,
                      'data-test-subj': 'correlationConditionOperator',
                    }}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={1}>
                  <Field
                    field={correlationConditionValue}
                    euiFieldProps={{
                      type: 'number',
                      min: 1,
                      'data-test-subj': 'correlationConditionValue',
                    }}
                  />
                </EuiFlexItem>
                {hasConditionField && (
                  <EuiFlexItem grow={2}>
                    <Field
                      field={correlationConditionField}
                      euiFieldProps={{
                        'data-test-subj': 'correlationConditionField',
                      }}
                    />
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
            <EuiCodeBlock fontSize="s" paddingSize="m" isCopyable>
              {i18n.CORRELATION_ESQL_PREVIEW_PLACEHOLDER}
            </EuiCodeBlock>
          </EuiFormRow>
        </>
      );
    },
    [
      showConditionSection,
      showConditionField,
      remoteClusters,
      remoteClustersLoading,
      remoteClustersError,
      recommendation,
      isRecommendationLoading,
    ]
  );

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
          correlationRemoteClusters: {
            path: `${path}.remoteClusters`,
            config: CORRELATION_REMOTE_CLUSTERS_CONFIG,
          },
          correlationTargetSpaces: {
            path: `${path}.targetSpaces`,
            config: CORRELATION_TARGET_SPACES_CONFIG,
          },
          correlationConditionOperator: {
            path: `${path}.condition.operator`,
            config: CORRELATION_CONDITION_OPERATOR_CONFIG,
          },
          correlationConditionValue: {
            path: `${path}.condition.value`,
            config: CORRELATION_CONDITION_VALUE_CONFIG,
          },
          correlationConditionField: {
            path: `${path}.condition.field`,
            config: CORRELATION_CONDITION_FIELD_CONFIG,
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
