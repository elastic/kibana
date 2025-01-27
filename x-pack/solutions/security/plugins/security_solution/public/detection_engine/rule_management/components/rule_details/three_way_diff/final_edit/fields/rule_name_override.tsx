/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { FormSchema, FormData } from '../../../../../../../shared_imports';
import { UseField } from '../../../../../../../shared_imports';
import { schema } from '../../../../../../rule_creation_ui/components/step_about_rule/schema';
import type {
  DiffableRule,
  RuleNameOverrideObject,
} from '../../../../../../../../common/api/detection_engine';
import { EsFieldSelectorField } from '../../../../../../rule_creation_ui/components/es_field_selector_field';
import { useRuleIndexPattern } from '../../../../../../rule_creation_ui/pages/form';
import { getUseRuleIndexPatternParameters } from '../utils';
import { useDefaultIndexPattern } from '../../../../../hooks/use_default_index_pattern';

export const ruleNameOverrideSchema = { ruleNameOverride: schema.ruleNameOverride } as FormSchema<{
  ruleNameOverride: string;
}>;

interface RuleNameOverrideEditProps {
  finalDiffableRule: DiffableRule;
}

export function RuleNameOverrideEdit({
  finalDiffableRule,
}: RuleNameOverrideEditProps): JSX.Element {
  const defaultIndexPattern = useDefaultIndexPattern();
  const indexPatternParameters = getUseRuleIndexPatternParameters(
    finalDiffableRule,
    defaultIndexPattern
  );
  const { indexPattern, isIndexPatternLoading } = useRuleIndexPattern(indexPatternParameters);

  const componentProps = useMemo(
    () => ({
      fieldType: 'string',
      indices: indexPattern,
      isDisabled: isIndexPatternLoading,
    }),
    [indexPattern, isIndexPatternLoading]
  );

  return (
    <UseField
      path="ruleNameOverride"
      component={EsFieldSelectorField}
      componentProps={componentProps}
    />
  );
}

export function ruleNameOverrideDeserializer(defaultValue: FormData) {
  return {
    ruleNameOverride: defaultValue.rule_name_override?.field_name ?? '',
  };
}

export function ruleNameOverrideSerializer(formData: FormData): {
  rule_name_override: RuleNameOverrideObject | undefined;
} {
  return {
    rule_name_override: formData.ruleNameOverride
      ? { field_name: formData.ruleNameOverride }
      : undefined,
  };
}
