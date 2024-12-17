/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FormSchema, FormData } from '../../../../../../../shared_imports';
import { UseField } from '../../../../../../../shared_imports';
import { schema } from '../../../../../../rule_creation_ui/components/step_about_rule/schema';
import type {
  DiffableRule,
  InvestigationFields,
  RuleFalsePositiveArray,
} from '../../../../../../../../common/api/detection_engine';
import { MultiSelectFieldsAutocomplete } from '../../../../../../rule_creation_ui/components/multi_select_fields';
import { useAllEsqlRuleFields } from '../../../../../../rule_creation_ui/hooks';
import { useDefaultIndexPattern } from '../../../../../hooks/use_default_index_pattern';
import { useRuleIndexPattern } from '../../../../../../rule_creation_ui/pages/form';
import { getUseRuleIndexPatternParameters } from '../utils';

export const investigationFieldsSchema = {
  investigationFields: schema.investigationFields,
} as FormSchema<{
  investigationFields: RuleFalsePositiveArray;
}>;

interface InvestigationFieldsEditProps {
  finalDiffableRule: DiffableRule;
}

export function InvestigationFieldsEdit({
  finalDiffableRule,
}: InvestigationFieldsEditProps): JSX.Element {
  const { type } = finalDiffableRule;

  const defaultIndexPattern = useDefaultIndexPattern();
  const indexPatternParameters = getUseRuleIndexPatternParameters(
    finalDiffableRule,
    defaultIndexPattern
  );
  const { indexPattern, isIndexPatternLoading } = useRuleIndexPattern(indexPatternParameters);

  const { fields: investigationFields, isLoading: isInvestigationFieldsLoading } =
    useAllEsqlRuleFields({
      esqlQuery: type === 'esql' ? finalDiffableRule.esql_query.query : undefined,
      indexPatternsFields: indexPattern.fields,
    });

  return (
    <UseField
      path="investigationFields"
      component={MultiSelectFieldsAutocomplete}
      componentProps={{
        browserFields: investigationFields,
        isDisabled: isIndexPatternLoading || isInvestigationFieldsLoading,
        fullWidth: true,
      }}
    />
  );
}

export function investigationFieldsDeserializer(defaultValue: FormData) {
  return {
    investigationFields: defaultValue.investigation_fields?.field_names ?? [],
  };
}

export function investigationFieldsSerializer(formData: FormData): {
  investigation_fields: InvestigationFields | undefined;
} {
  const hasInvestigationFields = formData.investigationFields.length > 0;

  return {
    investigation_fields: hasInvestigationFields
      ? {
          field_names: formData.investigationFields,
        }
      : undefined,
  };
}
