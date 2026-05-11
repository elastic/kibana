/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiForm, EuiSpacer } from '@elastic/eui';
import { useFormContext } from 'react-hook-form';
import {
  RULE_FORM_ID,
  RuleDetailsFieldGroup,
  ConditionFieldGroup,
  RuleExecutionFieldGroup,
  SubmissionButtons,
  ErrorCallOut,
} from '@kbn/alerting-v2-rule-form';
import type { FormValues } from '@kbn/alerting-v2-rule-form';
import type { ISearchGeneric } from '@kbn/search-types';
import type { SecurityRuleType } from '../constants';
import * as i18n from '../translations';
import { RuleTypeSwitcher } from './rule_type_switcher';
import { ThresholdFields } from './threshold_fields';

interface SecurityGuiRuleFormProps {
  onSubmit: (values: FormValues) => void;
  ruleType: SecurityRuleType;
  onRuleTypeChange: (ruleType: SecurityRuleType) => void;
  isUpdateView: boolean;
  isSubmitting: boolean;
  onCancel?: () => void;
  ruleId?: string;
  indexPatterns: string[];
  onIndexPatternsChange: (patterns: string[]) => void;
  groupByFields: string[];
  onGroupByFieldsChange: (fields: string[]) => void;
  thresholdValue: number;
  onThresholdValueChange: (value: number) => void;
  cardinalityField: string;
  onCardinalityFieldChange: (field: string) => void;
  cardinalityValue: number;
  onCardinalityValueChange: (value: number) => void;
  generatedQuery: string;
  search: ISearchGeneric;
}

export const SecurityGuiRuleForm = ({
  onSubmit,
  ruleType,
  onRuleTypeChange,
  isUpdateView,
  isSubmitting,
  onCancel,
  ruleId,
  indexPatterns,
  onIndexPatternsChange,
  groupByFields,
  onGroupByFieldsChange,
  thresholdValue,
  onThresholdValueChange,
  cardinalityField,
  onCardinalityFieldChange,
  cardinalityValue,
  onCardinalityValueChange,
  generatedQuery,
  search,
}: SecurityGuiRuleFormProps) => {
  const { handleSubmit } = useFormContext<FormValues>();

  return (
    <>
      <ErrorCallOut />
      <EuiSpacer size="m" />
      <EuiForm id={RULE_FORM_ID} component="form" onSubmit={handleSubmit(onSubmit)}>
        <RuleTypeSwitcher
          ruleType={ruleType}
          onChange={onRuleTypeChange}
          isUpdateView={isUpdateView}
        />
        {ruleType === 'threshold' && (
          <>
            <EuiSpacer size="m" />
            <ThresholdFields
              indexPatterns={indexPatterns}
              onIndexPatternsChange={onIndexPatternsChange}
              groupByFields={groupByFields}
              onGroupByFieldsChange={onGroupByFieldsChange}
              thresholdValue={thresholdValue}
              onThresholdValueChange={onThresholdValueChange}
              cardinalityField={cardinalityField}
              onCardinalityFieldChange={onCardinalityFieldChange}
              cardinalityValue={cardinalityValue}
              onCardinalityValueChange={onCardinalityValueChange}
              generatedQuery={generatedQuery}
              search={search}
            />
          </>
        )}
        <EuiSpacer size="m" />
        <RuleDetailsFieldGroup />
        <EuiSpacer size="m" />
        <ConditionFieldGroup
          includeBase={ruleType !== 'threshold'}
          groupFieldLabel={i18n.SUPPRESSION_FIELDS_LABEL}
        />
        <EuiSpacer size="m" />
        <RuleExecutionFieldGroup />
      </EuiForm>
      <SubmissionButtons
        isSubmitting={isSubmitting}
        onCancel={onCancel}
        ruleId={ruleId}
      />
    </>
  );
};
