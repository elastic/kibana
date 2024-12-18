/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { DataViewBase, DataViewFieldBase } from '@kbn/es-query';
import {
  getFieldValidityAndErrorMessage,
  type FieldHook,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { AboutStepRiskScore } from '../../../../detections/pages/detection_engine/rules/types';
import { DefaultRiskScore } from './default_risk_score';
import { RiskScoreOverride } from './risk_score_override';

interface RiskScoreFieldProps {
  dataTestSubj: string;
  field: FieldHook<AboutStepRiskScore>;
  idAria: string;
  indices: DataViewBase;
  isDisabled: boolean;
}

export const RiskScoreField = ({
  dataTestSubj,
  field,
  idAria,
  indices,
  isDisabled,
}: RiskScoreFieldProps) => {
  const { value, isMappingChecked, mapping } = field.value;
  const { setValue } = field;

  const handleDefaultRiskScoreChange = useCallback(
    (newDefaultRiskScoreValue: number) => {
      setValue({
        value: newDefaultRiskScoreValue,
        isMappingChecked,
        mapping,
      });
    },
    [setValue, isMappingChecked, mapping]
  );

  const handleRiskScoreMappingChange = useCallback(
    ([newField]: DataViewFieldBase[]): void => {
      setValue({
        value,
        isMappingChecked,
        mapping: [
          {
            field: newField?.name ?? '',
            operator: 'equals',
            value: '',
            risk_score: undefined,
          },
        ],
      });
    },
    [setValue, value, isMappingChecked]
  );

  const handleRiskScoreMappingChecked = useCallback(() => {
    setValue({
      value,
      isMappingChecked: !isMappingChecked,
      mapping: [...mapping],
    });
  }, [setValue, value, isMappingChecked, mapping]);

  const errorMessage = getFieldValidityAndErrorMessage(field).errorMessage ?? undefined;

  return (
    <EuiFlexGroup direction={'column'}>
      <DefaultRiskScore
        dataTestSubj={dataTestSubj}
        idAria={idAria}
        onChange={handleDefaultRiskScoreChange}
        value={value}
        errorMessage={errorMessage}
      />
      <EuiFlexItem>
        <RiskScoreOverride
          isMappingChecked={isMappingChecked}
          onToggleMappingChecked={handleRiskScoreMappingChecked}
          onMappingChange={handleRiskScoreMappingChange}
          dataTestSubj={dataTestSubj}
          idAria={idAria}
          mapping={mapping}
          indices={indices}
          isDisabled={isDisabled}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
