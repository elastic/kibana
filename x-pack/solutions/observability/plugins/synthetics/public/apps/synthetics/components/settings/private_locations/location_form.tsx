/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Ref } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiCallOut,
  EuiCode,
  EuiLink,
  EuiFieldTextProps,
} from '@elastic/eui';
import { useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { useFormContext, useFormState } from 'react-hook-form';
import { TagsField } from '../components/tags_field';
import { PrivateLocation } from '../../../../../../common/runtime_types';
import { AgentPolicyNeeded } from './agent_policy_needed';
import { PolicyHostsField, AGENT_POLICY_FIELD_NAME } from './policy_hosts';
import { selectAgentPolicies } from '../../../state/private_locations';

export const LocationForm = ({ privateLocations }: { privateLocations: PrivateLocation[] }) => {
  const { data } = useSelector(selectAgentPolicies);
  const { control, register, getValues } = useFormContext<PrivateLocation>();
  const { errors } = useFormState();
  const selectedPolicyId = getValues(AGENT_POLICY_FIELD_NAME);
  const selectedPolicy = data?.find((item) => item.id === selectedPolicyId);

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
        <EuiCallOut title={AGENT_CALLOUT_TITLE} size="s" style={{ textAlign: 'left' }}>
          <p>
            {
              <FormattedMessage
                id="xpack.synthetics.monitorManagement.agentCallout.content"
                defaultMessage='To run "Browser" monitors on this private location, make sure that you&apos;re using the {code} Docker container, which contains the dependencies necessary to run these monitors. For more information, {link}.'
                values={{
                  code: <EuiCode>elastic-agent-complete</EuiCode>,
                  link: (
                    <EuiLink
                      data-test-subj="syntheticsLocationFormReadTheDocsLink"
                      target="_blank"
                      href="https://www.elastic.co/guide/en/observability/current/uptime-set-up-choose-agent.html#private-locations"
                      external
                    >
                      <FormattedMessage
                        id="xpack.synthetics.monitorManagement.agentCallout.link"
                        defaultMessage="read the docs"
                      />
                    </EuiLink>
                  ),
                }}
              />
            }
          </p>
        </EuiCallOut>

        <EuiSpacer />
        {selectedPolicy?.agents === 0 && (
          <EuiCallOut
            title={AGENT_MISSING_CALLOUT_TITLE}
            size="s"
            style={{ textAlign: 'left' }}
            color="warning"
          >
            <p>
              {
                <FormattedMessage
                  id="xpack.synthetics.monitorManagement.agentMissingCallout.content"
                  defaultMessage="You have selected an agent policy that has no agent attached. Make sure that you have at least one agent enrolled in this policy. You can add an agent before or after creating a location. For more information, {link}."
                  values={{
                    link: (
                      <EuiLink
                        data-test-subj="syntheticsLocationFormReadTheDocsLink"
                        target="_blank"
                        href="https://www.elastic.co/guide/en/observability/current/synthetics-private-location.html#synthetics-private-location-fleet-agent"
                        external
                      >
                        <FormattedMessage
                          id="xpack.synthetics.monitorManagement.agentCallout.link"
                          defaultMessage="read the docs"
                        />
                      </EuiLink>
                    ),
                  }}
                />
              }
            </p>
          </EuiCallOut>
        )}
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
