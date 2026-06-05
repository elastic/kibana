/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiComboBox,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import type { DataViewFieldBase } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import type { FieldHook } from '../../../../../shared_imports';
import type { AlertSuppressionGroupByV2FormEntry } from '../../../../common/types';
import { FIELD_PLACEHOLDER } from '../../../../rule_creation_ui/components/multi_select_fields/translations';

const MAX_EQL_V2_GROUP_FIELDS = 3;

const EQL_V2_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.ruleManagement.ruleFields.alertSuppression.eqlGroupByV2.fieldLabel',
  {
    defaultMessage: 'Field',
  }
);

const EQL_V2_SEQUENCE_INDEX_LABEL = i18n.translate(
  'xpack.securitySolution.ruleManagement.ruleFields.alertSuppression.eqlGroupByV2.sequenceIndexLabel',
  {
    defaultMessage: 'Sequence event',
  }
);

const EQL_V2_ADD_ROW = i18n.translate(
  'xpack.securitySolution.ruleManagement.ruleFields.alertSuppression.eqlGroupByV2.addRow',
  {
    defaultMessage: 'Add field',
  }
);

const EQL_V2_FORM_ROW_LABEL = i18n.translate(
  'xpack.securitySolution.ruleManagement.ruleFields.alertSuppression.eqlGroupByV2.sectionLabel',
  {
    defaultMessage: 'Field-specific suppression (EQL)',
  }
);

const EQL_V2_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.ruleManagement.ruleFields.alertSuppression.eqlGroupByV2.helpText',
  {
    defaultMessage:
      'For EQL sequence rules only: target individual fields and optionally a specific sequence event when suppressing. Up to three entries. This augments the standard “Suppress alerts by” list above; you can use one or both.',
  }
);

const EQL_V2_REMOVE_ROW = i18n.translate(
  'xpack.securitySolution.ruleManagement.ruleFields.alertSuppression.eqlGroupByV2.removeRow',
  {
    defaultMessage: 'Remove row',
  }
);

export const EqlGroupByV2Fields: React.FC<{
  field: FieldHook<AlertSuppressionGroupByV2FormEntry[] | undefined>;
  browserFields: DataViewFieldBase[];
  isDisabled: boolean;
  showSequenceIndex: boolean;
}> = ({ field, browserFields, isDisabled, showSequenceIndex }) => {
  const rows: AlertSuppressionGroupByV2FormEntry[] = useMemo(
    () => field.value ?? [],
    [field.value]
  );

  const setRows = useCallback(
    (next: AlertSuppressionGroupByV2FormEntry[]) => {
      void field.setValue(next);
    },
    [field]
  );

  const options: EuiComboBoxOptionOption<string>[] = useMemo(
    () => browserFields.map((f) => ({ label: f.name })),
    [browserFields]
  );

  const onFieldChange = useCallback(
    (index: number, nextFieldName: string) => {
      const next = rows.map((r, i) => (i === index ? { ...r, field: nextFieldName } : r));
      setRows(next);
    },
    [rows, setRows]
  );

  const onSequenceIndexChange = useCallback(
    (index: number, nextValue: number | undefined) => {
      const next = rows.map((r, i) => (i === index ? { ...r, sequenceIndex: nextValue } : r));
      setRows(next);
    },
    [rows, setRows]
  );

  const onAddRow = useCallback(() => {
    if (rows.length >= MAX_EQL_V2_GROUP_FIELDS) {
      return;
    }
    setRows([...rows, { field: '' }]);
  }, [rows, setRows]);

  const onRemoveRow = useCallback(
    (index: number) => {
      setRows(rows.filter((_, i) => i !== index));
    },
    [rows, setRows]
  );

  return (
    <EuiFormRow
      label={EQL_V2_FORM_ROW_LABEL}
      helpText={EQL_V2_HELP_TEXT}
      data-test-subj="eqlGroupByV2Fields"
      fullWidth
    >
      <div>
        {rows.map((row, index) => {
          const selected: EuiComboBoxOptionOption<string>[] = row.field
            ? [{ label: row.field }]
            : [];
          return (
            <div key={index}>
              {index > 0 ? <EuiSpacer size="s" /> : null}
              <EuiFlexGroup alignItems="flexStart" gutterSize="s" responsive={true}>
                <EuiFlexItem>
                  <EuiComboBox
                    aria-label={EQL_V2_FIELD_LABEL}
                    placeholder={FIELD_PLACEHOLDER}
                    fullWidth
                    isDisabled={isDisabled}
                    singleSelection={{ asPlainText: true }}
                    options={options}
                    selectedOptions={selected}
                    onChange={(nextOptions) => {
                      const name = nextOptions[0]?.label ?? '';
                      onFieldChange(index, typeof name === 'string' ? name : String(name));
                    }}
                    isClearable
                  />
                </EuiFlexItem>
                {showSequenceIndex && (
                  <EuiFlexItem grow={false} style={{ minWidth: 140 }}>
                    <EuiFormRow label={EQL_V2_SEQUENCE_INDEX_LABEL} fullWidth>
                      <EuiFieldNumber
                        aria-label={EQL_V2_SEQUENCE_INDEX_LABEL}
                        data-test-subj="eqlGroupByV2SequenceIndex"
                        disabled={isDisabled}
                        min={0}
                        value={row.sequenceIndex ?? ''}
                        onChange={(e) => {
                          const n =
                            e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                          onSequenceIndexChange(
                            index,
                            n != null && !Number.isNaN(n) ? n : undefined
                          );
                        }}
                        compressed
                        fullWidth
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                )}
                <EuiFlexItem grow={false}>
                  <EuiFormRow hasEmptyLabelSpace>
                    <EuiToolTip content={EQL_V2_REMOVE_ROW} disableScreenReaderOutput>
                      <EuiButtonIcon
                        data-test-subj="eqlGroupByV2RemoveRow"
                        display="empty"
                        iconType="trash"
                        isDisabled={isDisabled}
                        aria-label={EQL_V2_REMOVE_ROW}
                        onClick={() => onRemoveRow(index)}
                      />
                    </EuiToolTip>
                  </EuiFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>
          );
        })}
        <EuiSpacer size="s" />
        <EuiButtonEmpty
          data-test-subj="eqlGroupByV2AddRow"
          size="xs"
          isDisabled={isDisabled || rows.length >= MAX_EQL_V2_GROUP_FIELDS}
          onClick={onAddRow}
        >
          {EQL_V2_ADD_ROW}
        </EuiButtonEmpty>
      </div>
    </EuiFormRow>
  );
};
