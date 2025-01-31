/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiFormRow } from '@elastic/eui';
import type { DataViewBase } from '@kbn/es-query';
import type { ThreatMapEntries } from '../../../../common/components/threat_match/types';
import { ThreatMatchComponent } from '../../../../common/components/threat_match';
import type { FieldHook } from '../../../../shared_imports';
import { UseField, getFieldValidityAndErrorMessage } from '../../../../shared_imports';
import { schema } from '../step_define_rule/schema';
import { QueryBarField } from '../query_bar_field';

interface ThreatMatchEditProps {
  path: string;
  threatIndexPatterns: DataViewBase;
  indexPatterns: DataViewBase;
  threatIndexPatternsLoading: boolean;
  onValidityChange?: (isValid: boolean) => void;
}

export const ThreatMatchEdit = memo(function ThreatMatchEdit({
  path,
  indexPatterns,
  threatIndexPatterns,
  threatIndexPatternsLoading,
  onValidityChange,
}: ThreatMatchEditProps): JSX.Element {
  const componentProps = {
    indexPatterns,
    threatIndexPatterns,
    threatIndexPatternsLoading,
    onValidityChange,
  };

  return <UseField path={path} component={ThreatMatchField} componentProps={componentProps} />;
});

interface ThreatMatchFieldProps {
  field: FieldHook<ThreatMapEntries[]>;
  threatIndexPatterns: DataViewBase;
  indexPatterns: DataViewBase;
  threatIndexPatternsLoading: boolean;
  onValidityChange?: (isValid: boolean) => void;
}

function ThreatMatchField({
  field,
  threatIndexPatterns,
  indexPatterns,
  threatIndexPatternsLoading,
  onValidityChange,
}: ThreatMatchFieldProps): JSX.Element {
  const { isInvalid: isThreatMappingInvalid, errorMessage } =
    getFieldValidityAndErrorMessage(field);
  const [isThreatIndexPatternValid, setIsThreatIndexPatternValid] = useState(false);

  useEffect(() => {
    if (onValidityChange) {
      onValidityChange(!isThreatMappingInvalid && isThreatIndexPatternValid);
    }
  }, [isThreatIndexPatternValid, isThreatMappingInvalid, onValidityChange]);

  const handleMappingsEntryChange = useCallback(
    (newEntryItems: ThreatMapEntries[]): void => {
      field.setValue(newEntryItems);
    },
    [field]
  );

  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow>
          <UseField
            path="threatQueryBar"
            config={{
              ...schema.threatQueryBar,
              labelAppend: null,
            }}
            component={QueryBarField}
            componentProps={{
              idAria: 'detectionEngineStepDefineThreatRuleQueryBar',
              indexPattern: threatIndexPatterns,
              isDisabled: false,
              isLoading: threatIndexPatternsLoading,
              dataTestSubj: 'detectionEngineStepDefineThreatRuleQueryBar',
              openTimelineSearch: false,
              onValidityChange: setIsThreatIndexPatternValid,
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={field.label}
        labelAppend={field.labelAppend}
        helpText={field.helpText}
        error={errorMessage}
        isInvalid={isThreatMappingInvalid}
        fullWidth
      >
        <ThreatMatchComponent
          mappingEntries={field.value}
          indexPatterns={indexPatterns}
          threatIndexPatterns={threatIndexPatterns}
          data-test-subj="threatmatch-builder"
          id-aria="threatmatch-builder"
          onMappingEntriesChange={handleMappingsEntryChange}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
    </>
  );
}
