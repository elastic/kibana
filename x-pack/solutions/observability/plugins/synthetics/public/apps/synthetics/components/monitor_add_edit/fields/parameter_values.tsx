/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormFieldset,
  EuiSpacer,
  EuiTextArea,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { countBy } from 'lodash';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { canRevealParameterValues } from '../../../../../../common/utils/can_reveal_parameter_values';
import { isJsonObjectString } from '../../../../../../common/utils/is_json_object_string';
import {
  MASKED_PARAM_VALUE,
  maskMonitorParams,
} from '../../../../../../common/utils/mask_monitor_params';
import type { Pair } from './key_value_field';
import { JSONEditor } from './code_editor';

export interface ParameterValuesEditorProps {
  onBlur?: () => void;
  onChange: (value: string) => void;
  readOnly?: boolean;
  value?: string;
}

interface ParameterRow {
  id: string;
  key: string;
  value: string;
}

// JSON.parse keeps only the last of duplicate keys, so names are read from the raw text.
const getTopLevelKeys = (json: string): string[] => {
  const keys: string[] = [];
  let depth = 0;
  let index = 0;
  while (index < json.length) {
    const char = json[index];
    if (char === '"') {
      let end = index + 1;
      while (end < json.length && json[end] !== '"') {
        end += json[end] === '\\' ? 2 : 1;
      }
      const token = json.slice(index, end + 1);
      index = end + 1;
      while (index < json.length && /\s/.test(json[index])) {
        index++;
      }
      if (depth === 1 && json[index] === ':') {
        keys.push(JSON.parse(token));
      }
    } else {
      if (char === '{' || char === '[') {
        depth++;
      } else if (char === '}' || char === ']') {
        depth--;
      }
      index++;
    }
  }
  return keys;
};

const hasDuplicateKeys = (keys: string[]): boolean => new Set(keys).size !== keys.length;

export const hasInvalidParamNames = (params?: string): boolean => {
  if (!params || !isJsonObjectString(params)) {
    return false;
  }
  const keys = getTopLevelKeys(params);
  return keys.includes('') || hasDuplicateKeys(keys);
};

export const paramsJsonToPairs = (params?: string): Pair[] => {
  if (!params) {
    return [];
  }

  try {
    const parsed = JSON.parse(params) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.entries(parsed as Record<string, unknown>).map(([key, val]) => [
        key,
        typeof val === 'string' ? val : JSON.stringify(val),
      ]);
    }
  } catch {
    return [];
  }

  return [];
};

export const canUseParameterPairs = (params?: string): boolean => {
  if (!params) {
    return true;
  }

  try {
    const parsed = JSON.parse(params) as unknown;
    return (
      parsed !== null &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      Object.values(parsed).every((value) => typeof value === 'string') &&
      !hasDuplicateKeys(getTopLevelKeys(params))
    );
  } catch {
    return false;
  }
};

// Serialized by hand so rows with a missing or repeated name reach validation instead of being
// dropped or merged.
export const pairsToParamsJson = (pairs: Pair[]): string => {
  const entries = pairs
    .filter(([key, val]) => key || val)
    .map(([key, val]) => `${JSON.stringify(key)}:${JSON.stringify(val)}`);
  return entries.length ? `{${entries.join(',')}}` : '';
};

const getEmptyValueRowIds = (rows: ParameterRow[]): ReadonlySet<string> =>
  new Set(rows.filter(({ value }) => !value).map(({ id }) => id));

type FocusTarget = { rowId: string; field: 'key' | 'value' } | 'add';

const MAX_VALUE_ROWS = 6;

const getValueRows = (value: string): number =>
  Math.min(Math.max(value.split('\n').length, 1), MAX_VALUE_ROWS);

export const ParameterValuesEditor = ({
  onBlur,
  onChange,
  readOnly,
  value,
}: ParameterValuesEditorProps): React.ReactElement => {
  const { application } = useKibana().services;
  const canReveal = canRevealParameterValues({
    canSave: Boolean(application?.capabilities.uptime.save),
    canReadParamValues: Boolean(application?.capabilities.uptime.canReadParamValues),
  });
  const nextRowId = useRef(0);
  const createRow = useCallback(([key, rowValue]: Pair): ParameterRow => {
    nextRowId.current += 1;
    return { id: String(nextRowId.current), key, value: rowValue };
  }, []);
  const createRows = useCallback(
    (params?: string) => paramsJsonToPairs(params).map(createRow),
    [createRow]
  );
  const [isJsonMode, setIsJsonMode] = useState(() => !canUseParameterPairs(value));
  const [rows, setRows] = useState<ParameterRow[]>(() => createRows(value));
  const [visibleRows, setVisibleRows] = useState<Record<string, boolean>>({});
  const [isJsonValueVisible, setIsJsonValueVisible] = useState(false);
  // Rows whose masked value was cleared for editing; left empty, they get the mask back on blur.
  const clearedMaskRowIds = useRef(new Set<string>());
  // Empty values have nothing to protect, so those rows are editable without clicking edit.
  const [editingIds, setEditingIds] = useState<ReadonlySet<string>>(() =>
    getEmptyValueRowIds(rows)
  );
  const [focusTarget, setFocusTarget] = useState<FocusTarget>();
  const loadRows = useCallback(
    (params?: string) => {
      const nextRows = createRows(params);
      setRows(nextRows);
      setEditingIds(getEmptyValueRowIds(nextRows));
    },
    [createRows]
  );
  const fieldRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});
  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const knownValue = useRef(value ?? '');
  // The form can hand values back late or batched, so values we emitted must not look external.
  const emittedValues = useRef<string[]>([]);
  const canUsePairs = useMemo(() => canUseParameterPairs(value), [value]);

  useEffect(() => {
    const current = value ?? '';
    const emittedIndex = emittedValues.current.indexOf(current);
    if (emittedIndex !== -1) {
      emittedValues.current = emittedValues.current.slice(emittedIndex + 1);
      knownValue.current = current;
      return;
    }
    if (current === knownValue.current) {
      return;
    }
    emittedValues.current = [];
    knownValue.current = current;
    loadRows(value);
    setIsJsonMode(!canUseParameterPairs(value));
  }, [loadRows, value]);

  const emit = useCallback(
    (next: string) => {
      const latest = emittedValues.current[emittedValues.current.length - 1] ?? knownValue.current;
      if (next === latest) {
        return;
      }
      emittedValues.current.push(next);
      onChange(next);
    },
    [onChange]
  );

  const updateRows = useCallback(
    (nextRows: ParameterRow[]) => {
      setRows(nextRows);
      emit(pairsToParamsJson(nextRows.map(({ key, value: rowValue }) => [key, rowValue])));
    },
    [emit]
  );

  const invalidRowIds = useMemo(() => {
    const keyCounts = countBy(rows.filter(({ key }) => key).map(({ key }) => key));
    return new Set(
      rows
        .filter(({ key, value: rowValue }) => (key ? keyCounts[key] > 1 : Boolean(rowValue)))
        .map(({ id }) => id)
    );
  }, [rows]);

  useEffect(() => {
    if (focusTarget === undefined) {
      return;
    }
    if (focusTarget === 'add') {
      addButtonRef.current?.focus();
    } else {
      fieldRefs.current[`${focusTarget.rowId}:${focusTarget.field}`]?.focus();
    }
    setFocusTarget(undefined);
  }, [focusTarget]);

  const startEditing = useCallback((id: string) => {
    setEditingIds((ids) => new Set(ids).add(id));
  }, []);

  const stopEditing = useCallback((id: string) => {
    setEditingIds((ids) => {
      const next = new Set(ids);
      next.delete(id);
      return next;
    });
  }, []);

  const editValue = useCallback(
    (row: ParameterRow) => {
      if (row.value === MASKED_PARAM_VALUE) {
        clearedMaskRowIds.current.add(row.id);
        updateRows(
          rows.map((current) => (current.id === row.id ? { ...row, value: '' } : current))
        );
      }
      startEditing(row.id);
      setFocusTarget({ rowId: row.id, field: 'value' });
    },
    [rows, startEditing, updateRows]
  );

  const jsonVisibilityLabel = !canReveal
    ? NO_READ_PARAMETER_VALUES_PERMISSION
    : isJsonValueVisible
    ? HIDE_PARAMETER_VALUE_LABEL
    : SHOW_PARAMETER_VALUE_LABEL;
  const hideJsonValues = canReveal && !isJsonValueVisible;

  const modeToggle = isJsonMode ? (
    <EuiToolTip content={canUsePairs ? undefined : PAIRS_UNAVAILABLE_LABEL}>
      <EuiButtonEmpty
        data-test-subj="syntheticsParamsEditorModeToggle"
        iconType="listBullet"
        isDisabled={!canUsePairs}
        onClick={() => {
          loadRows(value);
          setIsJsonMode(false);
        }}
        size="s"
      >
        {EDIT_AS_PAIRS_LABEL}
      </EuiButtonEmpty>
    </EuiToolTip>
  ) : (
    <EuiButtonEmpty
      data-test-subj="syntheticsParamsEditorModeToggle"
      iconType="code"
      onClick={() => setIsJsonMode(true)}
      size="s"
    >
      {EDIT_AS_JSON_LABEL}
    </EuiButtonEmpty>
  );

  return (
    <div data-test-subj="syntheticsMonitorConfigParams">
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" responsive={false}>
        {isJsonMode && (
          <EuiFlexItem grow={false}>
            <EuiToolTip content={jsonVisibilityLabel} disableScreenReaderOutput>
              <span tabIndex={canReveal ? -1 : 0}>
                <EuiButtonIcon
                  aria-label={jsonVisibilityLabel}
                  data-test-subj="syntheticsParamValueVisibilityJson"
                  iconType={isJsonValueVisible ? 'eyeSlash' : 'eye'}
                  isDisabled={!canReveal}
                  onClick={() => setIsJsonValueVisible((visible) => !visible)}
                  size="s"
                />
              </span>
            </EuiToolTip>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>{modeToggle}</EuiFlexItem>
        {!isJsonMode && (
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="syntheticsMonitorConfigParams__button"
              iconType="plus"
              buttonRef={addButtonRef}
              isDisabled={readOnly}
              onClick={() => {
                const newRow = createRow(['', '']);
                startEditing(newRow.id);
                updateRows([newRow, ...rows]);
                setFocusTarget({ rowId: newRow.id, field: 'key' });
              }}
              size="s"
            >
              {ADD_PARAMETER_LABEL}
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {isJsonMode ? (
        <JSONEditor
          ariaLabel={PARAMETER_JSON_EDITOR_LABEL}
          height="100px"
          id="syntheticsMonitorConfigParams"
          onChange={emit}
          readOnly={readOnly || hideJsonValues}
          value={hideJsonValues ? maskMonitorParams(value) ?? '' : value ?? ''}
        />
      ) : (
        rows.length > 0 && (
          <EuiFormFieldset>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem>{PARAMETER_KEY_LABEL}</EuiFlexItem>
              <EuiFlexItem>{PARAMETER_VALUE_LABEL}</EuiFlexItem>
              <EuiFlexItem grow={false} />
            </EuiFlexGroup>
            {rows.map(({ id, key, value: paramValue }, index) => {
              const parameterName = key || String(index + 1);
              const deleteLabel = i18n.translate(
                'xpack.synthetics.monitorConfig.params.deleteItem.label',
                {
                  defaultMessage: 'Delete parameter {key}',
                  values: { key: parameterName },
                }
              );
              const editLabel = i18n.translate(
                'xpack.synthetics.monitorConfig.params.editItem.label',
                {
                  defaultMessage: 'Edit parameter {key}',
                  values: { key: parameterName },
                }
              );
              const keyInputLabel = i18n.translate(
                'xpack.synthetics.monitorConfig.params.keyInput.label',
                {
                  defaultMessage: 'Parameter {parameterName}',
                  values: { parameterName },
                }
              );
              const valueInputLabel = i18n.translate(
                'xpack.synthetics.monitorConfig.params.valueInput.label',
                {
                  defaultMessage: 'Value for parameter {parameterName}',
                  values: { parameterName },
                }
              );
              const isValueVisible = Boolean(visibleRows[id]);
              const isEditing = editingIds.has(id);
              const showValue = isValueVisible || isEditing;
              const visibilityLabel = !canReveal
                ? NO_READ_PARAMETER_VALUES_PERMISSION
                : isValueVisible
                ? HIDE_PARAMETER_VALUE_LABEL
                : SHOW_PARAMETER_VALUE_LABEL;
              const updateRow = (nextRow: Partial<ParameterRow>) => {
                updateRows(rows.map((row) => (row.id === id ? { ...row, ...nextRow } : row)));
              };
              const handleValueBlur = () => {
                const wasMaskCleared = clearedMaskRowIds.current.delete(id);
                if (wasMaskCleared && !paramValue) {
                  updateRow({ value: MASKED_PARAM_VALUE });
                  stopEditing(id);
                } else if (paramValue) {
                  stopEditing(id);
                }
                onBlur?.();
              };

              return (
                <Fragment key={id}>
                  <EuiSpacer size="xs" />
                  <EuiFlexGroup alignItems="flexStart" gutterSize="s" responsive={false}>
                    <EuiFlexItem>
                      <EuiFieldText
                        aria-label={keyInputLabel}
                        compressed
                        data-test-subj={`keyValuePairsKey${index}`}
                        fullWidth
                        inputRef={(node) => {
                          fieldRefs.current[`${id}:key`] = node;
                        }}
                        isInvalid={invalidRowIds.has(id)}
                        onBlur={onBlur}
                        onChange={(event) => {
                          if (paramValue !== MASKED_PARAM_VALUE) {
                            updateRow({ key: event.target.value });
                            return;
                          }
                          // The stored secret is keyed by name, so a renamed mask has nothing to restore.
                          clearedMaskRowIds.current.delete(id);
                          startEditing(id);
                          updateRow({ key: event.target.value, value: '' });
                        }}
                        readOnly={readOnly}
                        value={key}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      {showValue ? (
                        <EuiTextArea
                          aria-label={valueInputLabel}
                          compressed
                          data-test-subj={`keyValuePairsValue${index}`}
                          fullWidth
                          inputRef={(node) => {
                            fieldRefs.current[`${id}:value`] = node;
                          }}
                          onBlur={handleValueBlur}
                          onChange={(event) => updateRow({ value: event.target.value })}
                          readOnly={readOnly || !isEditing}
                          resize="vertical"
                          rows={getValueRows(paramValue)}
                          value={paramValue}
                          wrap="off"
                        />
                      ) : (
                        <EuiFieldText
                          aria-label={valueInputLabel}
                          autoComplete="new-password"
                          compressed
                          data-test-subj={`keyValuePairsValue${index}`}
                          fullWidth
                          icon="lock"
                          inputRef={(node) => {
                            fieldRefs.current[`${id}:value`] = node;
                          }}
                          onBlur={handleValueBlur}
                          readOnly
                          type="password"
                          value={paramValue}
                        />
                      )}
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      {/* Keeps focus in the value on press, so it isn't re-masked (and the row resized) before the click lands. */}
                      <EuiFlexGroup
                        gutterSize="xs"
                        onMouseDown={(event) => event.preventDefault()}
                        responsive={false}
                      >
                        <EuiFlexItem grow={false}>
                          <EuiToolTip content={visibilityLabel} disableScreenReaderOutput>
                            <span tabIndex={canReveal ? -1 : 0}>
                              <EuiButtonIcon
                                aria-label={visibilityLabel}
                                data-test-subj={`syntheticsParamValueVisibility${index}`}
                                display="empty"
                                iconType={isValueVisible ? 'eyeSlash' : 'eye'}
                                isDisabled={!canReveal}
                                size="s"
                                onClick={() => {
                                  setVisibleRows((visible) => ({ ...visible, [id]: !visible[id] }));
                                }}
                              />
                            </span>
                          </EuiToolTip>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiToolTip content={editLabel} disableScreenReaderOutput>
                            <EuiButtonIcon
                              aria-label={editLabel}
                              data-test-subj={`syntheticsParamValueEdit${index}`}
                              display="empty"
                              iconType="pencil"
                              isDisabled={readOnly}
                              size="s"
                              onClick={() => editValue(rows[index])}
                            />
                          </EuiToolTip>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiToolTip content={deleteLabel} disableScreenReaderOutput>
                            <EuiButtonIcon
                              aria-label={deleteLabel}
                              color="danger"
                              data-test-subj="syntheticsKeyValuePairsFieldButton"
                              display="empty"
                              iconType="trash"
                              isDisabled={readOnly}
                              size="s"
                              onClick={() => {
                                const neighbor = rows[index + 1] ?? rows[index - 1];
                                updateRows(rows.filter((row) => row.id !== id));
                                setFocusTarget(
                                  neighbor ? { rowId: neighbor.id, field: 'key' } : 'add'
                                );
                              }}
                            />
                          </EuiToolTip>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </Fragment>
              );
            })}
          </EuiFormFieldset>
        )
      )}
    </div>
  );
};

const ADD_PARAMETER_LABEL = i18n.translate(
  'xpack.synthetics.monitorConfig.params.addParameter.label',
  {
    defaultMessage: 'Add parameter',
  }
);

const EDIT_AS_JSON_LABEL = i18n.translate('xpack.synthetics.monitorConfig.params.editAsJson', {
  defaultMessage: 'Edit as JSON',
});

const EDIT_AS_PAIRS_LABEL = i18n.translate('xpack.synthetics.monitorConfig.params.editAsPairs', {
  defaultMessage: 'Edit as key-value pairs',
});

const PAIRS_UNAVAILABLE_LABEL = i18n.translate(
  'xpack.synthetics.monitorConfig.params.pairsUnavailable',
  {
    defaultMessage: 'Key-value editing needs a JSON object with unique names and text values.',
  }
);

const PARAMETER_JSON_EDITOR_LABEL = i18n.translate(
  'xpack.synthetics.monitorConfig.paramsAria.label',
  {
    defaultMessage: 'Monitor params code editor',
  }
);

const PARAMETER_KEY_LABEL = i18n.translate('xpack.synthetics.monitorConfig.params.key.label', {
  defaultMessage: 'Parameter',
});

const PARAMETER_VALUE_LABEL = i18n.translate('xpack.synthetics.monitorConfig.params.value.label', {
  defaultMessage: 'Value',
});

const SHOW_PARAMETER_VALUE_LABEL = i18n.translate(
  'xpack.synthetics.monitorConfig.params.showValueButtonLabel',
  {
    defaultMessage: 'Show parameter value',
  }
);

const HIDE_PARAMETER_VALUE_LABEL = i18n.translate(
  'xpack.synthetics.monitorConfig.params.hideValueButtonLabel',
  {
    defaultMessage: 'Hide parameter value',
  }
);

const NO_READ_PARAMETER_VALUES_PERMISSION = i18n.translate(
  'xpack.synthetics.monitorConfig.params.noReadPermissionTooltip',
  {
    defaultMessage: 'You do not have permission to read parameter values.',
  }
);
