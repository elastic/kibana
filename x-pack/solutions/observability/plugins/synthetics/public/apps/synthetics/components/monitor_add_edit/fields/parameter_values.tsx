/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiSwitchEvent } from '@elastic/eui';
import { EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFormContext } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { ConfigKey } from '../../../../../../common/runtime_types';
import { maskMonitorParams } from '../../../../../../common/utils/mask_monitor_params';
import { fetchSyntheticsMonitor } from '../../../state/monitor_details/api';
import { useGetUrlParams } from '../../../hooks';
import { useIsEditFlow } from '../hooks';
import { useParameterValues } from '../form/parameter_values_context';
import { CodeEditor } from './code_editor';
import { kibanaService } from '../../../../../utils/kibana_service';
import type { CodeEditorProps } from './code_editor';
import { MonacoEditorLangId } from '../types';

type ParameterValuesEditorProps = Omit<CodeEditorProps, 'languageId'>;

export const ParameterValuesEditor = ({
  readOnly,
  value,
  ...props
}: ParameterValuesEditorProps): React.ReactElement => {
  const { hideParameterValues } = useParameterValues();

  return (
    <CodeEditor
      {...props}
      languageId={MonacoEditorLangId.JSON}
      readOnly={readOnly || hideParameterValues}
      value={hideParameterValues ? maskMonitorParams(value) ?? '' : value}
    />
  );
};

export const ParameterValuesVisibilityToggle = (): React.ReactElement | null => {
  const isEditFlow = useIsEditFlow();
  const { monitorId } = useParams<{ monitorId: string }>();
  const { spaceId } = useGetUrlParams();
  const { setValue } = useFormContext();
  const { hideParameterValues, revealParameterValues, setHideParameterValues } =
    useParameterValues();
  const [isLoading, setIsLoading] = useState(false);

  const onChange = async (event: EuiSwitchEvent) => {
    if (event.target.checked) {
      setHideParameterValues(true);
      return;
    }

    if (!monitorId) {
      return;
    }

    setIsLoading(true);
    try {
      const monitor = await fetchSyntheticsMonitor({ monitorId, spaceId, hideParams: false });
      setValue(ConfigKey.PARAMS, monitor[ConfigKey.PARAMS] ?? '', { shouldDirty: false });
      revealParameterValues();
    } catch (error) {
      kibanaService.toasts.addError(error, { title: SHOW_PARAMETER_VALUES_ERROR });
    } finally {
      setIsLoading(false);
    }
  };

  return isEditFlow ? (
    <EuiSwitch
      compressed
      checked={hideParameterValues}
      data-test-subj="syntheticsHideParameterValues"
      disabled={isLoading}
      id="syntheticsHideParameterValuesSwitch"
      label={HIDE_PARAMETER_VALUES_LABEL}
      onChange={onChange}
    />
  ) : null;
};

const HIDE_PARAMETER_VALUES_LABEL = i18n.translate(
  'xpack.synthetics.monitorConfig.params.hideValuesToggleSwitch',
  {
    defaultMessage: 'Hide parameter values',
  }
);

const SHOW_PARAMETER_VALUES_ERROR = i18n.translate(
  'xpack.synthetics.monitorConfig.params.showValuesErrorMessage',
  {
    defaultMessage: 'Unable to show parameter values. Please try again.',
  }
);
