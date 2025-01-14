/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { DataViewFieldBase } from '@kbn/es-query';
import { type FormData, type FieldHook, UseField } from '../../../../../../../shared_imports';
import type {
  DiffableRule,
  RiskScoreMapping,
} from '../../../../../../../../common/api/detection_engine';
import { RiskScoreOverride } from '../../../../../../rule_creation_ui/components/risk_score_mapping/risk_score_override';
import { useDefaultIndexPattern } from '../../../../../hooks/use_default_index_pattern';
import { getUseRuleIndexPatternParameters } from '../utils';
import { useRuleIndexPattern } from '../../../../../../rule_creation_ui/pages/form';
import { filterOutEmptyRiskScoreMappingItems } from '../../../../../../rule_creation_ui/pages/rule_creation/helpers';

interface RiskScoreMappingEditProps {
  finalDiffableRule: DiffableRule;
}

export function RiskScoreMappingEdit({ finalDiffableRule }: RiskScoreMappingEditProps) {
  return (
    <UseField
      path="riskScoreMapping"
      component={RiskScoreMappingField}
      componentProps={{
        finalDiffableRule,
      }}
    />
  );
}

interface RiskScoreMappingFieldProps {
  field: FieldHook<{ isMappingChecked: boolean; mapping: RiskScoreMapping }>;
  finalDiffableRule: DiffableRule;
}

function RiskScoreMappingField({ field, finalDiffableRule }: RiskScoreMappingFieldProps) {
  const defaultIndexPattern = useDefaultIndexPattern();
  const indexPatternParameters = getUseRuleIndexPatternParameters(
    finalDiffableRule,
    defaultIndexPattern
  );
  const { indexPattern, isIndexPatternLoading } = useRuleIndexPattern(indexPatternParameters);

  const { value, setValue } = field;

  const handleToggleMappingChecked = useCallback(() => {
    setValue((prevValue) => ({
      ...prevValue,
      isMappingChecked: !prevValue.isMappingChecked,
    }));
  }, [setValue]);

  const handleMappingChange = useCallback(
    ([newField]: DataViewFieldBase[]): void => {
      const mapping = [
        {
          field: newField?.name ?? '',
          operator: 'equals' as const,
          value: '',
        },
      ];

      setValue((prevValue) => ({
        ...prevValue,
        mapping,
      }));
    },
    [setValue]
  );

  return (
    <RiskScoreOverride
      isMappingChecked={value.isMappingChecked}
      mapping={value.mapping}
      onToggleMappingChecked={handleToggleMappingChecked}
      onMappingChange={handleMappingChange}
      indices={indexPattern}
      isDisabled={isIndexPatternLoading}
    />
  );
}

export function riskScoreMappingDeserializer(defaultValue: FormData) {
  return {
    riskScoreMapping: {
      isMappingChecked: defaultValue.risk_score_mapping.length > 0,
      mapping: defaultValue.risk_score_mapping,
    },
  };
}

export function riskScoreMappingSerializer(formData: FormData): {
  risk_score_mapping: RiskScoreMapping;
} {
  return {
    risk_score_mapping: formData.riskScoreMapping.isMappingChecked
      ? filterOutEmptyRiskScoreMappingItems(formData.riskScoreMapping.mapping)
      : [],
  };
}
