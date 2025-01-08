/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFieldText,
  EuiFormRow,
  EuiForm,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useSimpleMonitor } from './use_simple_monitor';
import { ServiceLocationsField } from './form_fields/service_locations';
import { ConfigKey, ServiceLocation, ServiceLocations } from '../../../../../common/runtime_types';
import { useCanEditSynthetics } from '../../../../hooks/use_capabilities';
import { useFormWrapped } from '../../../../hooks/use_form_wrapped';
import { NoPermissionsTooltip } from '../common/components/permissions';
import { isUrlValid } from '../../utils/validators/is_url_valid';

export interface SimpleFormData {
  urls: string;
  locations: ServiceLocations;
}

export const SimpleMonitorForm = () => {
  const {
    control,
    register,
    handleSubmit,
    formState: { isValid, isSubmitted },
    getFieldState,
    trigger,
  } = useFormWrapped({
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    shouldFocusError: true,
    defaultValues: { urls: '', locations: [] as ServiceLocations },
  });

  const [monitorData, setMonitorData] = useState<SimpleFormData | undefined>();

  const onSubmit = (data: SimpleFormData) => {
    setMonitorData(data);
  };

  const { loading, data: newMonitor } = useSimpleMonitor({ monitorData });

  const canEditSynthetics = useCanEditSynthetics();

  const urlFieldState = getFieldState(ConfigKey.URLS);
  const urlError = isSubmitted || urlFieldState.isTouched ? urlFieldState.error : undefined;

  return (
    <EuiForm
      onSubmit={handleSubmit(onSubmit)}
      component="form"
      isInvalid={isSubmitted && !isValid && !loading && !newMonitor?.id}
      noValidate
    >
      <EuiFormRow
        fullWidth
        label={WEBSITE_URL_LABEL}
        helpText={urlError ? undefined : WEBSITE_URL_HELP_TEXT}
        isInvalid={!!urlError}
        error={urlError?.message}
      >
        <EuiFieldText
          fullWidth
          {...register(ConfigKey.URLS, {
            validate: {
              notEmpty: (value: string) => (!Boolean(value.trim()) ? URL_REQUIRED_LABEL : true),
              notValidUrl: (value: string) => (!isUrlValid(value) ? URL_INVALID_LABEL : true),
            },
          })}
          isInvalid={!!urlError}
          data-test-subj={`${ConfigKey.URLS}-input`}
          tabIndex={0}
        />
      </EuiFormRow>
      <EuiSpacer />
      <ServiceLocationsField
        control={control}
        onChange={async (_locations: ServiceLocation[]) => {
          await trigger?.();
        }}
      />
      <EuiSpacer size="m" />
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <NoPermissionsTooltip canEditSynthetics={canEditSynthetics}>
            <EuiButton
              type="submit"
              fill
              iconType="plusInCircleFilled"
              isLoading={loading}
              data-test-subj="syntheticsMonitorConfigSubmitButton"
              disabled={!canEditSynthetics}
            >
              {CREATE_MONITOR_LABEL}
            </EuiButton>
          </NoPermissionsTooltip>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiForm>
  );
};

export const WEBSITE_URL_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.websiteUrlLabel',
  {
    defaultMessage: 'Website URL',
  }
);

export const WEBSITE_URL_HELP_TEXT = i18n.translate(
  'xpack.synthetics.monitorManagement.websiteUrlHelpText',
  {
    defaultMessage: `For example, your company's homepage or https://elastic.co.`,
  }
);

export const CREATE_MONITOR_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.createMonitorLabel',
  { defaultMessage: 'Create monitor' }
);

export const MONITOR_SUCCESS_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.monitorAddedSuccessMessage',
  {
    defaultMessage: 'Monitor added successfully.',
  }
);

export const MONITOR_FAILURE_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.monitorFailureMessage',
  {
    defaultMessage: 'Monitor was unable to be saved. Please try again later.',
  }
);

export const URL_REQUIRED_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.urlRequiredLabel',
  {
    defaultMessage: 'URL is required',
  }
);

export const URL_INVALID_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.urlInvalidLabel',
  {
    defaultMessage: 'URL is not valid',
  }
);
