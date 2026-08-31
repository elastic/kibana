/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { MetadataFilter, MetadataFilterOperator } from '../../common/metadata_filter';
import { METADATA_FILTER_OPERATORS } from '../../common/metadata_filter';
import type { MetadataField } from '../../common/metadata_filter';

const OPERATOR_LABELS: Record<MetadataFilterOperator, string> = {
  is: i18n.translate('xpack.entitiesRuntimeCaue.metadataFilter.operatorIs', {
    defaultMessage: 'is',
  }),
  isNot: i18n.translate('xpack.entitiesRuntimeCaue.metadataFilter.operatorIsNot', {
    defaultMessage: 'is not',
  }),
  contains: i18n.translate('xpack.entitiesRuntimeCaue.metadataFilter.operatorContains', {
    defaultMessage: 'contains',
  }),
  exists: i18n.translate('xpack.entitiesRuntimeCaue.metadataFilter.operatorExists', {
    defaultMessage: 'exists',
  }),
  doesNotExist: i18n.translate('xpack.entitiesRuntimeCaue.metadataFilter.operatorDoesNotExist', {
    defaultMessage: 'does not exist',
  }),
};

const OPERATOR_OPTIONS = METADATA_FILTER_OPERATORS.map((op) => ({
  value: op,
  text: OPERATOR_LABELS[op],
}));

/** Whether the operator requires a value field. */
const needsValue = (op: MetadataFilterOperator) => op !== 'exists' && op !== 'doesNotExist';

interface RowState {
  field: string;
  operator: MetadataFilterOperator;
  value: string;
}

const emptyRow = (): RowState => ({ field: '', operator: 'is', value: '' });

/** Returns only rows that are "complete" — field chosen and value provided when needed. */
const toAppliedFilters = (rows: RowState[]): MetadataFilter[] =>
  rows
    .filter((r) => r.field && (!needsValue(r.operator) || r.value.trim() !== ''))
    .map(({ field, operator, value }) => ({
      field,
      operator,
      ...(needsValue(operator) ? { value: value.trim() } : {}),
    }));

interface Props {
  fields: MetadataField[];
  onChange: (filters: MetadataFilter[]) => void;
}

/** Structured condition builder for metadata fields. Renders nothing if no fields are available. */
export const MetadataFilterBar = ({ fields, onChange }: Props) => {
  const [rows, setRows] = useState<RowState[]>([emptyRow()]);

  const fieldOptions = fields.map((f) => ({ label: f.name }));

  const commit = useCallback(
    (nextRows: RowState[]) => {
      setRows(nextRows);
      onChange(toAppliedFilters(nextRows));
    },
    [onChange]
  );

  const updateRow = useCallback(
    (index: number, patch: Partial<RowState>) => {
      const next = rows.map((r, i) => (i === index ? { ...r, ...patch } : r));
      commit(next);
    },
    [rows, commit]
  );

  const removeRow = useCallback(
    (index: number) => {
      const next = rows.filter((_, i) => i !== index);
      commit(next.length > 0 ? next : [emptyRow()]);
    },
    [rows, commit]
  );

  const addRow = useCallback(() => {
    commit([...rows, emptyRow()]);
  }, [rows, commit]);

  if (fields.length === 0) {
    return null;
  }

  return (
    <div data-test-subj="entitiesRuntimeMetadataFilterBar">
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.entitiesRuntimeCaue.metadataFilter.label', {
          defaultMessage: 'Metadata filter',
        })}
      </EuiText>
      <EuiSpacer size="xs" />
      {rows.map((row, index) => (
        <React.Fragment key={index}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            {/* Field selector */}
            <EuiFlexItem style={{ maxWidth: 200 }}>
              <EuiComboBox
                compressed
                singleSelection={{ asPlainText: true }}
                options={fieldOptions}
                selectedOptions={row.field ? [{ label: row.field }] : []}
                onChange={(selected) => {
                  updateRow(index, { field: selected[0]?.label ?? '' });
                }}
                placeholder={i18n.translate(
                  'xpack.entitiesRuntimeCaue.metadataFilter.fieldPlaceholder',
                  { defaultMessage: 'Field' }
                )}
                data-test-subj={`metadataFilterField-${index}`}
              />
            </EuiFlexItem>

            {/* Operator selector */}
            <EuiFlexItem style={{ maxWidth: 140 }}>
              <EuiSelect
                compressed
                options={OPERATOR_OPTIONS}
                value={row.operator}
                onChange={(e) => {
                  updateRow(index, { operator: e.target.value as MetadataFilterOperator });
                }}
                data-test-subj={`metadataFilterOperator-${index}`}
              />
            </EuiFlexItem>

            {/* Value field — hidden for exists / doesNotExist */}
            {needsValue(row.operator) && (
              <EuiFlexItem>
                <EuiFieldText
                  compressed
                  value={row.value}
                  onChange={(e) => {
                    // Update local state without committing mid-keystroke
                    const next = rows.map((r, i) =>
                      i === index ? { ...r, value: e.target.value } : r
                    );
                    setRows(next);
                  }}
                  onBlur={() => {
                    // Commit on blur so the query fires when the user leaves the field
                    onChange(toAppliedFilters(rows));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onChange(toAppliedFilters(rows));
                    }
                  }}
                  placeholder={i18n.translate(
                    'xpack.entitiesRuntimeCaue.metadataFilter.valuePlaceholder',
                    { defaultMessage: 'Value' }
                  )}
                  data-test-subj={`metadataFilterValue-${index}`}
                />
              </EuiFlexItem>
            )}

            {/* Remove row */}
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={i18n.translate('xpack.entitiesRuntimeCaue.metadataFilter.removeRow', {
                  defaultMessage: 'Remove condition',
                })}
                disableScreenReaderOutput
              >
                <EuiButtonIcon
                  iconType="trash"
                  color="danger"
                  aria-label={i18n.translate('xpack.entitiesRuntimeCaue.metadataFilter.removeRow', {
                    defaultMessage: 'Remove condition',
                  })}
                  onClick={() => removeRow(index)}
                  data-test-subj={`metadataFilterRemove-${index}`}
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
          {index < rows.length - 1 && <EuiSpacer size="xs" />}
        </React.Fragment>
      ))}
      <EuiSpacer size="xs" />
      <EuiButtonEmpty
        iconType="plusInCircle"
        size="xs"
        onClick={addRow}
        data-test-subj="metadataFilterAddRow"
      >
        {i18n.translate('xpack.entitiesRuntimeCaue.metadataFilter.addCondition', {
          defaultMessage: 'Add condition',
        })}
      </EuiButtonEmpty>
    </div>
  );
};
