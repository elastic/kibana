/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFieldPassword,
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
import { useParams } from 'react-router-dom';
import { ConfigKey } from '../../../../../../common/runtime_types';
import { canRevealParameterValues } from '../../../../../../common/utils/can_reveal_parameter_values';
import { restoreMaskedMonitorParams } from '../../../../../../common/utils/mask_monitor_params';
import { fetchSyntheticsMonitor } from '../../../state/monitor_details/api';
import { useGetUrlParams } from '../../../hooks';
import { useParameterValues } from '../form/parameter_values_context';
import { kibanaService } from '../../../../../utils/kibana_service';
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
  const { monitorId } = useParams<{ monitorId: string }>();
  const { spaceId } = useGetUrlParams();
  const { parametersAreMasked, revealParameterValues } = useParameterValues();
  const [isRevealing, setIsRevealing] = useState(false);
  const [visibleRows, setVisibleRows] = useState<Record<number, boolean>>({});
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

  const toggleValueVisibility = useCallback(
    async (index: number) => {
      if (!canReveal || isRevealing) {
        return;
      }

      if (visibleRows[index]) {
        setVisibleRows((rows) => ({ ...rows, [index]: false }));
        return;
      }

      if (parametersAreMasked && monitorId) {
        setIsRevealing(true);
        try {
          const monitor = await fetchSyntheticsMonitor({ monitorId, spaceId, hideParams: false });
          const plaintext = monitor[ConfigKey.PARAMS] ?? '';
          onChange(
            restoreMaskedMonitorParams({
              previousParams: plaintext,
              submittedParams: value,
            }) ?? ''
          );
          revealParameterValues(plaintext);
          setVisibleRows((rows) => ({ ...rows, [index]: true }));
        } catch (error) {
          kibanaService.toasts.addError(error, { title: SHOW_PARAMETER_VALUES_ERROR });
        } finally {
          setIsRevealing(false);
        }
        return;
      }

      setVisibleRows((rows) => ({ ...rows, [index]: true }));
    },
    [
      canReveal,
      isRevealing,
      monitorId,
      onChange,
      parametersAreMasked,
      revealParameterValues,
      spaceId,
      value,
      visibleRows,
    ]
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
                    <EuiFieldPassword
                      append={
                        <EuiToolTip content={visibilityLabel} disableScreenReaderOutput>
                          <span tabIndex={canReveal ? -1 : 0}>
                            <EuiButtonIcon
                              aria-label={visibilityLabel}
                              data-test-subj={`syntheticsParamValueVisibility${index}`}
                              iconType={isValueVisible ? 'eyeSlash' : 'eye'}
                              isDisabled={!canReveal || isRevealing}
                              onClick={() => {
                                void toggleValueVisibility(index);
                              }}
                            />
                          </span>
                        </EuiToolTip>
                      }
                      aria-label={PARAMETER_VALUE_LABEL}
                      autoComplete="new-password"
                      data-test-subj={`keyValuePairsValue${index}`}
                      fullWidth
                      isLoading={isRevealing}
                      onBlur={onBlur}
                      onChange={(event) => {
                        const nextPairs = [...pairs];
                        nextPairs[index] = [key, event.target.value];
                        updatePairs(nextPairs);
                      }}
                      readOnly={readOnly}
                      type={isValueVisible ? 'text' : 'password'}
                      value={paramValue}
                    />
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
                        onClick={() => {
                          const nextPairs = [...pairs];
                          nextPairs.splice(index, 1);
                          updatePairs(nextPairs);
                        }}
                      />
                    </EuiToolTip>
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

const SHOW_PARAMETER_VALUES_ERROR = i18n.translate(
  'xpack.synthetics.monitorConfig.params.showValuesErrorMessage',
  {
    defaultMessage: 'Unable to show parameter values. Please try again.',
  }
);
