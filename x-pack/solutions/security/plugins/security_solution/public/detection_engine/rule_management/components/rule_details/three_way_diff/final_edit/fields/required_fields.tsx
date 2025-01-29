/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FormSchema, FormData } from '../../../../../../../shared_imports';
import { schema } from '../../../../../../rule_creation_ui/components/step_define_rule/schema';
import type {
  DiffableRule,
  RequiredFieldInput,
} from '../../../../../../../../common/api/detection_engine';
import { RequiredFields } from '../../../../../../rule_creation/components/required_fields';
import { useDefaultIndexPattern } from '../../../../../hooks/use_default_index_pattern';
import { getUseRuleIndexPatternParameters } from '../utils';
import { useRuleIndexPattern } from '../../../../../../rule_creation_ui/pages/form';
import { removeEmptyRequiredFields } from '../../../../../../rule_creation_ui/pages/rule_creation/helpers';

export const requiredFieldsSchema = {
  requiredFields: schema.requiredFields,
} as FormSchema<{
  requiredFields: RequiredFieldInput[];
}>;

interface RequiredFieldsEditProps {
  finalDiffableRule: DiffableRule;
}

export function RequiredFieldsEdit({ finalDiffableRule }: RequiredFieldsEditProps): JSX.Element {
  const defaultIndexPattern = useDefaultIndexPattern();
  const indexPatternParameters = getUseRuleIndexPatternParameters(
    finalDiffableRule,
    defaultIndexPattern
  );
  const { indexPattern, isIndexPatternLoading } = useRuleIndexPattern(indexPatternParameters);

  return (
    <RequiredFields
      path="requiredFields"
      indexPatternFields={indexPattern.fields}
      isIndexPatternLoading={isIndexPatternLoading}
    />
  );
}

export function requiredFieldsDeserializer(defaultValue: FormData) {
  return {
    requiredFields: defaultValue.required_fields,
  };
}

export function requiredFieldsSerializer(formData: FormData): {
  required_fields: RequiredFieldInput[];
} {
  const requiredFields = (formData.requiredFields ?? []) as RequiredFieldInput[];
  return {
    required_fields: removeEmptyRequiredFields(requiredFields),
  };
}
