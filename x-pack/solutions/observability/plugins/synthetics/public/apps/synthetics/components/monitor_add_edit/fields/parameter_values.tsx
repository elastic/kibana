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
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { canRevealParameterValues } from '../../../../../../common/utils/can_reveal_parameter_values';
import { MASKED_PARAM_VALUE } from '../../../../../../common/utils/mask_monitor_params';
import type { Pair } from './key_value_field';

interface ParameterValuesEditorProps {
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
  const { application } = useKibana().services;
  const [visibleRows, setVisibleRows] = useState<Record<number, boolean>>({});
  const [editingIndex, setEditingIndex] = useState<number>();
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const valueBeforeEdit = useRef<Record<number, string>>({});
  const pairsFromValue = useMemo(() => paramsJsonToPairs(value), [value]);
  const [pairs, setPairs] = useState<Pair[]>(pairsFromValue);

  const canReveal = canRevealParameterValues({
    canSave: Boolean(application?.capabilities.uptime.save),
    canReadParamValues: Boolean(application?.capabilities.uptime.canReadParamValues),
  });

  useEffect(() => {
    setPairs((prevPairs) => (isEqual(prevPairs, pairsFromValue) ? prevPairs : pairsFromValue));
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

  const editValue = useCallback(
    (index: number) => {
      const current = pairs[index];
      if (!current || readOnly) {
        return;
      }
      const [key, paramValue] = current;
      valueBeforeEdit.current[index] = paramValue;
      if (paramValue === MASKED_PARAM_VALUE) {
        const nextPairs = [...pairs];
        nextPairs[index] = [key, ''];
        updatePairs(nextPairs);
      }
      setEditingIndex(index);
    },
    [pairs, readOnly, updatePairs]
  );

  const toggleValueVisibility = useCallback(
    (index: number) => {
      if (!canReveal) {
        return;
      }

      setVisibleRows((rows) => ({ ...rows, [index]: !rows[index] }));
    },
    [canReveal]
  );

  return (
    <div data-test-subj="syntheticsMonitorConfigParams">
      <EuiSpacer size="s" />
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="syntheticsMonitorConfigParams__button"
            iconType="plus"
            isDisabled={readOnly}
            onClick={() => updatePairs([['', ''], ...pairs])}
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
            const deleteLabel = i18n.translate(
              'xpack.synthetics.monitorConfig.params.deleteItem.label',
              {
                defaultMessage: 'Delete parameter {key}',
                values: { key: key || String(index + 1) },
              }
            );
            const isValueVisible = Boolean(visibleRows[index]);
            const showValue = isValueVisible || editingIndex === index;
            const editLabel = i18n.translate(
              'xpack.synthetics.monitorConfig.params.editItem.label',
              {
                defaultMessage: 'Edit parameter {key}',
                values: { key: key || String(index + 1) },
              }
            );
            const visibilityLabel = !canReveal
              ? NO_READ_PARAMETER_VALUES_PERMISSION
              : isValueVisible
              ? HIDE_PARAMETER_VALUE_LABEL
              : SHOW_PARAMETER_VALUE_LABEL;

            return (
              <Fragment key={index}>
                <EuiSpacer size="xs" />
                <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                  <EuiFlexItem>
                    <EuiFieldText
                      aria-label={PARAMETER_KEY_LABEL}
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
                          <span tabIndex={canReveal ? -1 : 0}>
                            <EuiButtonIcon
                              aria-label={visibilityLabel}
                              data-test-subj={`syntheticsParamValueVisibility${index}`}
                              iconType={isValueVisible ? 'eyeSlash' : 'eye'}
                              isDisabled={!canReveal}
                              size="s"
                              onClick={() => {
                                toggleValueVisibility(index);
                              }}
                            />
                          </span>
                        </EuiToolTip>
                      }
                      aria-label={PARAMETER_VALUE_LABEL}
                      autoComplete="new-password"
                      compressed
                      data-test-subj={`keyValuePairsValue${index}`}
                      fullWidth
                      icon="lock"
                      inputRef={(node) => {
                        inputRefs.current[index] = node;
                      }}
                      onBlur={() => {
                        const previous = valueBeforeEdit.current[index];
                        delete valueBeforeEdit.current[index];
                        setEditingIndex((current) => (current === index ? undefined : current));
                        if (previous && paramValue === '') {
                          const nextPairs = [...pairs];
                          nextPairs[index] = [key, previous];
                          updatePairs(nextPairs);
                        }
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
                              editValue(index);
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
