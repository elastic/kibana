/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useCallback } from 'react';
import type { DataViewBase, DataViewFieldBase } from '@kbn/es-query';
import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { Severity, SeverityMapping } from '@kbn/securitysolution-io-ts-alerting-types';
import type { AboutStepSeverity } from '../../../../detections/pages/detection_engine/rules/types';
import { DefaultSeverity } from './default_severity';
import { SeverityOverride } from './severity_override';

interface SeverityFieldProps {
  dataTestSubj: string;
  field: FieldHook<AboutStepSeverity>;
  idAria: string;
  indices: DataViewBase;
  isDisabled: boolean;
  setRiskScore: (severity: Severity) => void;
}

export const SeverityField = ({
  dataTestSubj,
  field,
  idAria,
  indices,
  isDisabled,
  setRiskScore,
}: SeverityFieldProps) => {
  const { value, isMappingChecked, mapping } = field.value;
  const { setValue } = field;

  const handleFieldValueChange = useCallback(
    (newMappingItems: SeverityMapping, index: number): void => {
      setValue({
        value,
        isMappingChecked,
        mapping: [...mapping.slice(0, index), ...newMappingItems, ...mapping.slice(index + 1)],
      });
    },
    [value, isMappingChecked, mapping, setValue]
  );

  const handleFieldChange = useCallback(
    (index: number, severity: Severity, [newField]: DataViewFieldBase[]): void => {
      const newMappingItems: SeverityMapping = [
        {
          ...mapping[index],
          field: newField?.name ?? '',
          value: newField != null ? mapping[index].value : '',
          operator: 'equals',
          severity,
        },
      ];
      handleFieldValueChange(newMappingItems, index);
    },
    [mapping, handleFieldValueChange]
  );

  const handleDefaultSeverityChange = useCallback(
    (newValue: Severity) => {
      setValue({
        value: newValue,
        isMappingChecked,
        mapping,
      });
      setRiskScore(newValue);
    },
    [isMappingChecked, mapping, setValue, setRiskScore]
  );

  const handleFieldMatchValueChange = useCallback(
    (index: number, severity: Severity, newMatchValue: string): void => {
      const newMappingItems: SeverityMapping = [
        {
          ...mapping[index],
          field: mapping[index].field,
          value: mapping[index].field != null && mapping[index].field !== '' ? newMatchValue : '',
          operator: 'equals',
          severity,
        },
      ];

      handleFieldValueChange(newMappingItems, index);
    },
    [mapping, handleFieldValueChange]
  );

  const handleSeverityMappingChecked = useCallback(() => {
    setValue({
      value,
      mapping: [...mapping],
      isMappingChecked: !isMappingChecked,
    });
  }, [isMappingChecked, mapping, value, setValue]);

  return (
    <EuiFlexGroup direction={'column'}>
      <DefaultSeverity value={value} onChange={handleDefaultSeverityChange} />
      <EuiFlexItem>
        <SeverityOverride
          isDisabled={isDisabled}
          onSeverityMappingChecked={handleSeverityMappingChecked}
          onFieldChange={handleFieldChange}
          onFieldMatchValueChange={handleFieldMatchValueChange}
          isMappingChecked={isMappingChecked}
          dataTestSubj={dataTestSubj}
          idAria={idAria}
          mapping={mapping}
          indices={indices}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
