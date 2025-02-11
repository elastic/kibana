/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useSelector } from 'react-redux';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHealth,
  EuiSuperSelectProps,
  EuiSuperSelect,
  EuiText,
  EuiToolTip,
  EuiSpacer,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useSyntheticsSettingsContext } from '../../../contexts';
import { AgentPolicyCallout } from './agent_policy_callout';
import { PrivateLocation } from '../../../../../../common/runtime_types';
import { selectAgentPolicies } from '../../../state/agent_policies';

export const AGENT_POLICY_FIELD_NAME = 'agentPolicyId';

export const PolicyHostsField = ({ privateLocations }: { privateLocations: PrivateLocation[] }) => {
  const { data } = useSelector(selectAgentPolicies);
  const { basePath } = useSyntheticsSettingsContext();

  const {
    control,
    formState: { isSubmitted },
    trigger,
    getValues,
  } = useFormContext<PrivateLocation>();
  const { isTouched, error } = control.getFieldState(AGENT_POLICY_FIELD_NAME);
  const showFieldInvalid = (isSubmitted || isTouched) && !!error;
  const selectedPolicyId = getValues(AGENT_POLICY_FIELD_NAME);

  const selectedPolicy = data?.find((item) => item.id === selectedPolicyId);

  const policyHostsOptions = data?.map((item) => {
    const hasLocation = privateLocations.find((location) => location.agentPolicyId === item.id);
    return {
      disabled: Boolean(hasLocation),
      value: item.id,
      inputDisplay: (
        <EuiHealth
          color={item.status === 'active' ? 'success' : 'warning'}
          style={{ lineHeight: 'inherit' }}
        >
          {item.name}
        </EuiHealth>
      ),
      'data-test-subj': item.name,
      dropdownDisplay: (
        <EuiToolTip
          content={
            hasLocation?.label
              ? i18n.translate('xpack.synthetics.monitorManagement.anotherPrivateLocation', {
                  defaultMessage:
                    'This agent policy is already attached to location: {locationName}.',
                  values: { locationName: hasLocation?.label },
                })
              : undefined
          }
        >
          <>
            <EuiHealth
              color={item.status === 'active' ? 'success' : 'warning'}
              style={{ lineHeight: 'inherit' }}
            >
              <strong>{item.name}</strong>
            </EuiHealth>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiText size="s" color="subdued" className="eui-textNoWrap">
                  <p>
                    {AGENTS_LABEL} {item.agents}
                  </p>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s" color="subdued">
                  <p>{item.description}</p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        </EuiToolTip>
      ),
    };
  });

  return (
    <>
      <EuiFormRow
        fullWidth
        label={POLICY_HOST_LABEL}
        labelAppend={
          <EuiButtonEmpty
            data-test-subj="syntheticsPolicyHostsFieldCreatePolicyButton"
            size="xs"
            href={basePath + '/app/fleet/policies?create'}
          >
            {i18n.translate('xpack.synthetics.policyHostsField.createButtonEmptyLabel', {
              defaultMessage: 'Create policy',
            })}
          </EuiButtonEmpty>
        }
        helpText={showFieldInvalid ? SELECT_POLICY_HOSTS_HELP_TEXT : undefined}
        isInvalid={showFieldInvalid}
        error={showFieldInvalid ? SELECT_POLICY_HOSTS : undefined}
      >
        <Controller
          name={AGENT_POLICY_FIELD_NAME}
          control={control}
          rules={{ required: true }}
          render={({ field }) => (
            <SuperSelect
              fullWidth
              aria-label={SELECT_POLICY_HOSTS}
              placeholder={SELECT_POLICY_HOSTS}
              valueOfSelected={field.value}
              itemLayoutAlign="top"
              popoverProps={{ repositionOnScroll: true }}
              hasDividers
              isInvalid={showFieldInvalid}
              options={policyHostsOptions ?? []}
              {...field}
              onBlur={async () => {
                await trigger();
              }}
            />
          )}
        />
      </EuiFormRow>
      <EuiSpacer />
      {selectedPolicy?.agents === 0 && <AgentPolicyCallout />}
    </>
  );
};

const AGENTS_LABEL = i18n.translate('xpack.synthetics.monitorManagement.agentsLabel', {
  defaultMessage: 'Agents: ',
});

const SELECT_POLICY_HOSTS = i18n.translate('xpack.synthetics.monitorManagement.selectPolicyHost', {
  defaultMessage: 'Select agent policy',
});

const SELECT_POLICY_HOSTS_HELP_TEXT = i18n.translate(
  'xpack.synthetics.monitorManagement.selectPolicyHost.helpText',
  {
    defaultMessage: 'We recommend using a single Elastic agent per agent policy.',
  }
);

const POLICY_HOST_LABEL = i18n.translate('xpack.synthetics.monitorManagement.policyHost', {
  defaultMessage: 'Agent policy',
});

export const SuperSelect = React.forwardRef<HTMLSelectElement, EuiSuperSelectProps<string>>(
  (props, ref) => (
    <span ref={ref} tabIndex={-1}>
      <EuiSuperSelect data-test-subj="syntheticsAgentPolicySelect" {...props} />
    </span>
  )
);
