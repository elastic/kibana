/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { useSelector } from 'react-redux-v7';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHealth,
  EuiText,
  EuiSpacer,
  EuiSwitch,
  EuiButtonEmpty,
  EuiCallOut,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { useSyntheticsSettingsContext } from '../../../contexts';
import { AgentPolicyCallout } from './agent_policy_callout';
import type { PrivateLocation } from '../../../../../../common/runtime_types';
import { selectAgentPolicies } from '../../../state/agent_policies';

export const AGENT_POLICY_FIELD_NAME = 'agentPolicyId';
export const AGENT_CONDITION_SHARDING_FIELD_NAME = 'agentConditionSharding';

type PolicyOption = EuiComboBoxOptionOption<string>;

export const PolicyHostsField = ({
  privateLocations,
  isDisabled,
}: {
  privateLocations: PrivateLocation[];
  isDisabled?: boolean;
}) => {
  const { data } = useSelector(selectAgentPolicies);
  const { basePath } = useSyntheticsSettingsContext();

  const {
    control,
    formState: { isSubmitted },
    trigger,
  } = useFormContext<PrivateLocation>();

  const { isTouched, error } = control.getFieldState(AGENT_POLICY_FIELD_NAME);
  const showFieldInvalid = (isSubmitted || isTouched) && !!error;

  const selectedId = useWatch({ control, name: AGENT_POLICY_FIELD_NAME });

  // A policy already backing another location can't be reused.
  const usedByOtherLocations = useMemo(() => {
    const used = new Set<string>();
    privateLocations.forEach((location) => {
      if (location.agentPolicyId) {
        used.add(location.agentPolicyId);
      }
    });
    return used;
  }, [privateLocations]);

  const policyById = useMemo(() => {
    const map = new Map<string, NonNullable<typeof data>[number]>();
    data?.forEach((item) => map.set(item.id, item));
    return map;
  }, [data]);

  const options: PolicyOption[] = useMemo(
    () =>
      data?.map((item) => ({
        // Coalesce: EuiComboBox lowercases labels for search and throws on undefined.
        label: item.name ?? item.id ?? '',
        value: item.id,
        disabled: usedByOtherLocations.has(item.id) && item.id !== selectedId,
        'data-test-subj': item.name,
      })) ?? [],
    [data, usedByOtherLocations, selectedId]
  );

  const renderOption = (option: PolicyOption) => {
    const policy = policyById.get(option.value ?? '');
    return (
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        responsive={false}
        css={{ overflow: 'hidden' }}
      >
        <EuiFlexItem grow={true} css={{ overflow: 'hidden' }}>
          <EuiHealth
            color={policy?.status === 'active' ? 'success' : 'warning'}
            className="eui-textTruncate"
          >
            {option.label}
          </EuiHealth>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued" className="eui-textNoWrap">
            {AGENTS_LABEL}
            {policy?.agents ?? 0}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  const hasEmptyPolicy = selectedId ? policyById.get(selectedId)?.agents === 0 : false;
  const conditionSharding = useWatch({ control, name: AGENT_CONDITION_SHARDING_FIELD_NAME });

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
        helpText={showFieldInvalid ? SELECT_POLICY_HOSTS_HELP_TEXT : POLICY_HOSTS_HELP_TEXT}
        isInvalid={showFieldInvalid}
        error={showFieldInvalid ? SELECT_POLICY_HOSTS : undefined}
      >
        <Controller
          name={AGENT_POLICY_FIELD_NAME}
          control={control}
          rules={{ validate: (val?: string) => Boolean(val) || SELECT_POLICY_HOSTS }}
          render={({ field }) => (
            <EuiComboBox<string>
              data-test-subj="syntheticsAgentPolicySelect"
              isDisabled={isDisabled}
              fullWidth
              singleSelection={{ asPlainText: true }}
              aria-label={SELECT_POLICY_HOSTS}
              placeholder={SELECT_POLICY_HOSTS}
              isInvalid={showFieldInvalid}
              options={options}
              selectedOptions={options.filter((opt) => opt.value === selectedId)}
              renderOption={renderOption}
              rowHeight={40}
              onChange={(selected) => {
                field.onChange(selected[0]?.value ?? '');
              }}
              onBlur={async () => {
                field.onBlur();
                await trigger();
              }}
            />
          )}
        />
      </EuiFormRow>
      <EuiSpacer />
      {Boolean(selectedId) && (
        <>
          <Controller
            name={AGENT_CONDITION_SHARDING_FIELD_NAME}
            control={control}
            render={({ field }) => (
              <EuiSwitch
                data-test-subj="syntheticsConditionShardingSwitch"
                label={CONDITION_SHARDING_LABEL}
                checked={Boolean(field.value)}
                onChange={(e) => field.onChange(e.target.checked)}
              />
            )}
          />
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            {CONDITION_SHARDING_HELP_TEXT}
          </EuiText>
          {Boolean(conditionSharding) && (
            <>
              <EuiSpacer />
              <EuiCallOut
                announceOnMount
                data-test-subj="syntheticsConditionShardingCallout"
                title={CONDITION_SHARDING_CALLOUT_TITLE}
                size="s"
                color="primary"
                iconType="cluster"
              >
                <FormattedMessage
                  id="xpack.synthetics.monitorManagement.conditionShardingCallout.content"
                  defaultMessage="Enroll multiple agents into this single policy. Kibana distributes monitors across them with a per-monitor host condition, so each monitor runs on exactly one agent (no duplicate runs) and moves to a healthy agent on failover."
                />
              </EuiCallOut>
            </>
          )}
          <EuiSpacer />
        </>
      )}
      {hasEmptyPolicy && <AgentPolicyCallout />}
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

const POLICY_HOSTS_HELP_TEXT = i18n.translate(
  'xpack.synthetics.monitorManagement.selectPolicyHosts.poolHelpText',
  {
    defaultMessage:
      'Select the agent policy for this location. To scale out, enroll several agents into that policy and turn on the option below.',
  }
);

const POLICY_HOST_LABEL = i18n.translate('xpack.synthetics.monitorManagement.policyHost', {
  defaultMessage: 'Agent policy',
});

const CONDITION_SHARDING_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.conditionSharding.label',
  {
    defaultMessage: 'Scale with multiple agents on this policy',
  }
);

const CONDITION_SHARDING_HELP_TEXT = i18n.translate(
  'xpack.synthetics.monitorManagement.conditionSharding.helpText',
  {
    defaultMessage:
      'Run several agents under this one policy and let Kibana shard monitors across them for at-most-once execution and failover.',
  }
);

const CONDITION_SHARDING_CALLOUT_TITLE = i18n.translate(
  'xpack.synthetics.monitorManagement.conditionShardingCallout.title',
  {
    defaultMessage: 'Condition-based sharding',
  }
);
