/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import { EuiFormRow, EuiFlexGroup, EuiSpacer, EuiText } from '@elastic/eui';
import type { DataViewBase } from '@kbn/es-query';
import usePrevious from 'react-use/lib/usePrevious';
import { createOrNewEntryItem } from '../../../../common/components/threat_match/helpers';
import type { ThreatMapping } from '../../../../../common/api/detection_engine/model/rule_schema';
import { ThreatMatchComponent } from '../../../../common/components/threat_match';
import * as i18n from '../../../../common/components/threat_match/translations';
import type { FieldHook } from '../../../../shared_imports';
import { getFieldValidityAndErrorMessage } from '../../../../shared_imports';

export const DEFAULT_THREAT_MAPPING_VALUE = [createOrNewEntryItem()];

interface ThreatMatchMappingFieldProps {
  field: FieldHook<ThreatMapping[number][]>;
  indexPatterns: DataViewBase;
  threatIndexPatterns: DataViewBase;
}

export function ThreatMatchMappingField({
  field,
  indexPatterns,
  threatIndexPatterns,
}: ThreatMatchMappingFieldProps): JSX.Element {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  const { setValue, validate } = field;
  const prevIndexTitle = usePrevious(indexPatterns.title);
  const prevThreatTitle = usePrevious(threatIndexPatterns.title);

  // We have to make sure validation runs against the latest source events index patterns
  // and threat match index patterns.
  // Form lib's `fieldsToValidateOnChange` on the corresponding index patterns edit fields
  // doesn't help here. It leads to running threat match mapping validation before render
  // of this component happens. In the end validation runs against previous index patterns
  // producing invalid validation results.
  //
  // Validating the field imperatively here fixes this issue.
  useEffect(() => {
    if (indexPatterns.title === prevIndexTitle && threatIndexPatterns.title === prevThreatTitle) {
      return;
    }

    validate();
  }, [indexPatterns.title, threatIndexPatterns.title, prevIndexTitle, prevThreatTitle, validate]);

  const handleMappingChange = useCallback(
    (entryItems: ThreatMapping[number][]): void => {
      if (entryItems.length === 0) {
        setValue(DEFAULT_THREAT_MAPPING_VALUE);
        return;
      }

      setValue(entryItems);
    },
    [setValue]
  );

  return (
    <EuiFormRow
      label={
        <div>
          <EuiFlexGroup gutterSize="s">
            <label>{field.label}</label>
          </EuiFlexGroup>
          <EuiSpacer size="xs" />
          <EuiText size="xs">{i18n.THREAT_FIELD_LABEL_HELP_TEXT}</EuiText>
        </div>
      }
      labelAppend={field.labelAppend}
      helpText={field.helpText}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth
    >
      <ThreatMatchComponent
        mappingEntries={field.value}
        indexPatterns={indexPatterns}
        threatIndexPatterns={threatIndexPatterns}
        data-test-subj="ruleThreatMatchMappingField"
        id-aria="ruleThreatMatchMappingField"
        onMappingEntriesChange={handleMappingChange}
      />
    </EuiFormRow>
  );
}
