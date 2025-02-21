/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Ref } from 'react';
import { EuiFieldText, EuiForm, EuiFormRow, EuiSpacer, EuiFieldTextProps } from '@elastic/eui';
import { useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { useFormContext, useFormState } from 'react-hook-form';
import { selectAgentPolicies } from '../../../state/agent_policies';
import { BrowserMonitorCallout } from './browser_monitor_callout';
import { SpaceSelector } from '../components/spaces_select';
import { TagsField } from '../components/tags_field';
import { PrivateLocation } from '../../../../../../common/runtime_types';
import { AgentPolicyNeeded } from './agent_policy_needed';
import { PolicyHostsField } from './policy_hosts';

export const LocationForm = ({ privateLocations }: { privateLocations: PrivateLocation[] }) => {
  const { data } = useSelector(selectAgentPolicies);
  const { control, register } = useFormContext<PrivateLocation>();
  const { errors } = useFormState();

  const tagsList = privateLocations.reduce((acc, item) => {
    const tags = item.tags || [];
    return [...acc, ...tags];
  }, [] as string[]);

  return (
    <>
      {data?.length === 0 && <AgentPolicyNeeded />}
      <EuiForm component="form" noValidate>
        <EuiFormRow
          fullWidth
          label={LOCATION_NAME_LABEL}
          isInvalid={Boolean(errors?.label)}
          error={errors?.label?.message as string}
        >
          <FieldText
            data-test-subj="syntheticsLocationFormFieldText"
            fullWidth
            aria-label={LOCATION_NAME_LABEL}
            {...register('label', {
              required: {
                value: true,
                message: NAME_REQUIRED,
              },
              validate: (val: string) => {
                return privateLocations.some((loc) => loc.label === val)
                  ? NAME_ALREADY_EXISTS
                  : undefined;
              },
            })}
          />
        </EuiFormRow>
        <EuiSpacer />
        <PolicyHostsField privateLocations={privateLocations} />
        <EuiSpacer />
        <TagsField tagsList={tagsList} control={control} errors={errors} />
        <EuiSpacer />
        <BrowserMonitorCallout />
        <EuiSpacer />
        <SpaceSelector />
      </EuiForm>
    </>
  );
};

const FieldText = React.forwardRef<HTMLInputElement, EuiFieldTextProps>(
  (props, ref: Ref<HTMLInputElement>) => (
    <EuiFieldText data-test-subj="syntheticsFieldTextFieldText" {...props} inputRef={ref} />
  )
);

export const AGENT_CALLOUT_TITLE = i18n.translate(
  'xpack.synthetics.monitorManagement.agentCallout.title',
  {
    defaultMessage: 'Requirement',
  }
);

export const AGENT_MISSING_CALLOUT_TITLE = i18n.translate(
  'xpack.synthetics.monitorManagement.agentMissingCallout.title',
  {
    defaultMessage: 'Selected agent policy has no agents',
  }
);

export const LOCATION_NAME_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.locationName',
  {
    defaultMessage: 'Location name',
  }
);

const NAME_ALREADY_EXISTS = i18n.translate('xpack.synthetics.monitorManagement.alreadyExists', {
  defaultMessage: 'Location name already exists.',
});

const NAME_REQUIRED = i18n.translate('xpack.synthetics.monitorManagement.nameRequired', {
  defaultMessage: 'Location name is required',
});
