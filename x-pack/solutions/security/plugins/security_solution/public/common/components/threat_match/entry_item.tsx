/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFormRow, EuiFlexGroup, EuiFlexItem, EuiToolTip, EuiSuperSelect } from '@elastic/eui';
import { i18n as i18nTranslate } from '@kbn/i18n';
import { css } from '@emotion/react';

import { EsFieldSelector } from '@kbn/securitysolution-autocomplete';
import type { DataViewBase, DataViewFieldBase } from '@kbn/es-query';
import type { ThreatMappingEntry } from '../../../../common/api/detection_engine/model/rule_schema';
import type { FormattedEntry } from './types';
import * as i18n from './translations';
import {
  getEntryOnFieldChange,
  getEntryOnThreatFieldChange,
  getEntryOnMatchChange,
} from './helpers';

interface EntryItemProps {
  entry: FormattedEntry;
  indexPattern: DataViewBase;
  threatIndexPatterns: DataViewBase;
  showLabel: boolean;
  onChange: (arg: ThreatMappingEntry, i: number) => void;
  doesNotMatchDisabled?: boolean;
}

const LABEL_PADDING = 20;

export const EntryItem: React.FC<EntryItemProps> = ({
  entry,
  indexPattern,
  threatIndexPatterns,
  showLabel,
  onChange,
  doesNotMatchDisabled,
}): JSX.Element => {
  const handleFieldChange = useCallback(
    ([newField]: DataViewFieldBase[]): void => {
      const { updatedEntry, index } = getEntryOnFieldChange(entry, newField);
      onChange(updatedEntry, index);
    },
    [onChange, entry]
  );

  const handleThreatFieldChange = useCallback(
    ([newField]: DataViewFieldBase[]): void => {
      const { updatedEntry, index } = getEntryOnThreatFieldChange(entry, newField);
      onChange(updatedEntry, index);
    },
    [onChange, entry]
  );

  const handleMatchChange = useCallback(
    (negate: boolean): void => {
      const { updatedEntry, index } = getEntryOnMatchChange(entry, negate);
      onChange(updatedEntry, index);
    },
    [onChange, entry]
  );

  const renderFieldInput = useMemo(() => {
    const comboBox = (
      <EuiToolTip display="block" position="top" content={entry.field?.name}>
        <EsFieldSelector
          placeholder={i18n.FIELD_PLACEHOLDER}
          indexPattern={indexPattern}
          selectedField={entry.field}
          isClearable={false}
          isLoading={false}
          isDisabled={indexPattern == null}
          onChange={handleFieldChange}
          data-test-subj="entryField"
        />
      </EuiToolTip>
    );

    const label = showLabel ? i18n.FIELD : '';
    return (
      <EuiFormRow label={label} data-test-subj="entryItemFieldInputFormRow">
        {comboBox}
      </EuiFormRow>
    );
  }, [handleFieldChange, indexPattern, entry, showLabel]);

  const renderMatchInput = useMemo(() => {
    const options = [
      { value: 'MATCHES', inputDisplay: i18n.MATCHES },
      {
        value: 'DOES_NOT_MATCH',
        inputDisplay: i18n.DOES_NOT_MATCH,
        disabled: doesNotMatchDisabled,
      },
    ];
    return (
      <EuiFormRow data-test-subj="entryItemMatchInputFormRow">
        <EuiSuperSelect
          options={options}
          valueOfSelected={entry.negate ? 'DOES_NOT_MATCH' : 'MATCHES'}
          onChange={(value) => handleMatchChange(value === 'DOES_NOT_MATCH')}
          aria-label={i18nTranslate.translate(
            'xpack.securitySolution.threatMapping.entryItem.matchOperatorAriaLabel',
            {
              defaultMessage: 'Match operator',
            }
          )}
        />
      </EuiFormRow>
    );
  }, [handleMatchChange, entry, doesNotMatchDisabled]);

  const renderThreatFieldInput = useMemo(() => {
    const comboBox = (
      <EuiToolTip display="block" position="top" content={entry.value?.name}>
        <EsFieldSelector
          placeholder={i18n.FIELD_PLACEHOLDER}
          indexPattern={threatIndexPatterns}
          selectedField={entry.value}
          isClearable={false}
          isLoading={false}
          isDisabled={threatIndexPatterns == null}
          onChange={handleThreatFieldChange}
          data-test-subj="threatEntryField"
        />
      </EuiToolTip>
    );

    const label = showLabel ? i18n.THREAT_FIELD : '';
    return (
      <EuiFormRow label={label} data-test-subj="threatFieldInputFormRow">
        {comboBox}
      </EuiFormRow>
    );
  }, [handleThreatFieldChange, threatIndexPatterns, entry, showLabel]);

  return (
    <EuiFlexGroup
      direction="row"
      gutterSize="s"
      alignItems="center"
      justifyContent="spaceAround"
      data-test-subj="itemEntryContainer"
    >
      <EuiFlexItem grow={3}>{renderFieldInput}</EuiFlexItem>
      <EuiFlexItem
        grow={2}
        className="eui-textCenter"
        css={css`
          padding-top: ${showLabel ? LABEL_PADDING : 0}px;
        `}
      >
        {renderMatchInput}
      </EuiFlexItem>
      <EuiFlexItem grow={3}>{renderThreatFieldInput}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

EntryItem.displayName = 'EntryItem';
