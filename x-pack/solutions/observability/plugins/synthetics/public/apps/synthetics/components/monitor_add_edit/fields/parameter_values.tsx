/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormFieldset,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEqual } from 'lodash';
import type { Pair } from './key_value_field';
import { JSONEditor } from './code_editor';

export interface ParameterValuesEditorProps {
  onBlur?: () => void;
  onChange: (value: string) => void;
  readOnly?: boolean;
  value?: string;
}

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
      Object.values(parsed).every((value) => typeof value === 'string' && !value.includes('\n'))
    );
  } catch {
    return false;
  }
};

export const pairsToParamsJson = (pairs: Pair[]): string => {
  const params: Record<string, string> = {};
  for (const [key, val] of pairs) {
    if (key) {
      params[key] = val;
    }
  }
  return Object.keys(params).length ? JSON.stringify(params) : '';
};

export const ParameterValuesEditor = ({
  onBlur,
  onChange,
  readOnly,
  value,
}: ParameterValuesEditorProps): React.ReactElement => {
  const [visibleRows, setVisibleRows] = useState<Record<number, boolean>>({});
  const [editingIndex, setEditingIndex] = useState<number>();
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const pairsFromValue = useMemo(() => paramsJsonToPairs(value), [value]);
  const [pairs, setPairs] = useState<Pair[]>(pairsFromValue);
  const useParameterPairs = useMemo(() => canUseParameterPairs(value), [value]);

  useEffect(() => {
    setPairs((prevPairs) => {
      const keylessPairs = prevPairs.filter(([key]) => !key);
      const nextPairs = [...keylessPairs, ...pairsFromValue];
      return isEqual(prevPairs, nextPairs) ? prevPairs : nextPairs;
    });
  }, [pairsFromValue]);

  const updatePairs = useCallback(
    (nextPairs: Pair[]) => {
      setPairs(nextPairs);
      const next = pairsToParamsJson(nextPairs);
      if (next !== (value ?? '')) {
        onChange(next);
      }
    },
    [onChange, value]
  );

  useEffect(() => {
    if (editingIndex === undefined) {
      return;
    }
    inputRefs.current[editingIndex]?.focus();
  }, [editingIndex]);

  if (!useParameterPairs) {
    return (
      <div data-test-subj="syntheticsMonitorConfigParams">
        <JSONEditor
          ariaLabel={PARAMETER_JSON_EDITOR_LABEL}
          height="100px"
          id="syntheticsMonitorConfigParams"
          onChange={onChange}
          readOnly={readOnly}
          value={value ?? ''}
        />
      </div>
    );
  }

  return (
    <div data-test-subj="syntheticsMonitorConfigParams">
      <EuiSpacer size="s" />
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="syntheticsMonitorConfigParams__button"
            iconType="plus"
            isDisabled={readOnly}
            onClick={() => {
              setVisibleRows({});
              updatePairs([['', ''], ...pairs]);
            }}
            size="s"
          >
            {ADD_PARAMETER_LABEL}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {pairs.length > 0 && (
        <EuiFormFieldset>
          <EuiFlexGroup gutterSize="s" responsive={false}>
            <EuiFlexItem>{PARAMETER_KEY_LABEL}</EuiFlexItem>
            <EuiFlexItem>{PARAMETER_VALUE_LABEL}</EuiFlexItem>
            <EuiFlexItem grow={false} />
          </EuiFlexGroup>
          {pairs.map(([key, paramValue], index) => {
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
            const isValueVisible = Boolean(visibleRows[index]);
            const showValue = isValueVisible || editingIndex === index;
            const visibilityLabel = isValueVisible
              ? HIDE_PARAMETER_VALUE_LABEL
              : SHOW_PARAMETER_VALUE_LABEL;

            return (
              <Fragment key={index}>
                <EuiSpacer size="xs" />
                <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                  <EuiFlexItem>
                    <EuiFieldText
                      aria-label={keyInputLabel}
                      compressed
                      data-test-subj={`keyValuePairsKey${index}`}
                      fullWidth
                      onBlur={onBlur}
                      onChange={(event) => {
                        const nextPairs = [...pairs];
                        nextPairs[index] = [event.target.value, paramValue];
                        updatePairs(nextPairs);
                      }}
                      readOnly={readOnly}
                      value={key}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFieldText
                      append={
                        <EuiToolTip content={visibilityLabel} disableScreenReaderOutput>
                          <EuiButtonIcon
                            aria-label={visibilityLabel}
                            data-test-subj={`syntheticsParamValueVisibility${index}`}
                            iconType={isValueVisible ? 'eyeSlash' : 'eye'}
                            size="s"
                            onClick={() => {
                              setVisibleRows((rows) => ({ ...rows, [index]: !rows[index] }));
                            }}
                          />
                        </EuiToolTip>
                      }
                      aria-label={valueInputLabel}
                      autoComplete="new-password"
                      compressed
                      data-test-subj={`keyValuePairsValue${index}`}
                      fullWidth
                      icon="lock"
                      inputRef={(node) => {
                        inputRefs.current[index] = node;
                      }}
                      onBlur={() => {
                        setEditingIndex((current) => (current === index ? undefined : current));
                        onBlur?.();
                      }}
                      onChange={(event) => {
                        const nextPairs = [...pairs];
                        nextPairs[index] = [key, event.target.value];
                        updatePairs(nextPairs);
                      }}
                      readOnly={readOnly || editingIndex !== index}
                      type={showValue ? 'text' : 'password'}
                      value={paramValue}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup gutterSize="xs" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiToolTip content={editLabel} disableScreenReaderOutput>
                          <EuiButtonIcon
                            aria-label={editLabel}
                            data-test-subj={`syntheticsParamValueEdit${index}`}
                            display="empty"
                            iconType="pencil"
                            isDisabled={readOnly}
                            size="s"
                            onClick={() => {
                              setEditingIndex(index);
                            }}
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
                              setVisibleRows({});
                              const nextPairs = [...pairs];
                              nextPairs.splice(index, 1);
                              updatePairs(nextPairs);
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
