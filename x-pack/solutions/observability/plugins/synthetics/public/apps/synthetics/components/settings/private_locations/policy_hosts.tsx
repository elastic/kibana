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
export const AGENT_POLICY_IDS_FIELD_NAME = 'agentPolicyIds';

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
    setValue,
    getValues,
  } = useFormContext<PrivateLocation>();

  const { isTouched, error } = control.getFieldState(AGENT_POLICY_IDS_FIELD_NAME);
  const showFieldInvalid = (isSubmitted || isTouched) && !!error;

  // Reactive view of the selected pool so callouts update as the user selects.
  const watchedIds = useWatch({ control, name: AGENT_POLICY_IDS_FIELD_NAME });
  const selectedIds = watchedIds?.length
    ? watchedIds
    : [getValues(AGENT_POLICY_FIELD_NAME)].filter(Boolean);

  // A policy already backing another location can't be reused as a shard.
  const usedByOtherLocations = useMemo(() => {
    const used = new Set<string>();
    privateLocations.forEach((location) => {
      if (location.agentPolicyId) {
        used.add(location.agentPolicyId);
      }
      location.agentPolicyIds?.forEach((id) => used.add(id));
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
        disabled: usedByOtherLocations.has(item.id) && !selectedIds.includes(item.id),
        'data-test-subj': item.name,
      })) ?? [],
    [data, usedByOtherLocations, selectedIds]
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

  const isScalable = selectedIds.length > 1;
  const hasEmptyPolicy = selectedIds.some((id) => policyById.get(id)?.agents === 0);

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
          name={AGENT_POLICY_IDS_FIELD_NAME}
          control={control}
          rules={{ validate: (val?: string[]) => (val && val.length > 0) || SELECT_POLICY_HOSTS }}
          render={({ field }) => (
            <EuiComboBox<string>
              data-test-subj="syntheticsAgentPolicySelect"
              isDisabled={isDisabled}
              fullWidth
              aria-label={SELECT_POLICY_HOSTS}
              placeholder={SELECT_POLICY_HOSTS}
              isInvalid={showFieldInvalid}
              options={options}
              selectedOptions={options.filter((opt) => selectedIds.includes(opt.value ?? ''))}
              renderOption={renderOption}
              rowHeight={40}
              onChange={(selected) => {
                const ids = selected.map((opt) => opt.value ?? '').filter(Boolean);
                field.onChange(ids);
                // Keep the legacy primary agent policy in sync (first selected).
                // Spaces filtering and classic (single-shard) behaviour rely on it.
                setValue(AGENT_POLICY_FIELD_NAME, ids[0] ?? '', {
                  shouldDirty: true,
                  shouldValidate: isSubmitted,
                });
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
      {isScalable && (
        <>
          <EuiCallOut
            data-test-subj="syntheticsScalableLocationCallout"
            title={SCALABLE_CALLOUT_TITLE}
            size="s"
            color="primary"
            iconType="shard"
          >
            <FormattedMessage
              id="xpack.synthetics.monitorManagement.scalableLocationCallout.content"
              defaultMessage="Monitors will be sharded across these {count} agent policies for at-most-once execution and failover. Enroll one agent per policy."
              values={{ count: selectedIds.length }}
            />
          </EuiCallOut>
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
      'Select one agent policy for a standard location, or several to shard monitors across a pool of agents (one agent per policy).',
  }
);

const POLICY_HOST_LABEL = i18n.translate('xpack.synthetics.monitorManagement.policyHost', {
  defaultMessage: 'Agent policies',
});

const SCALABLE_CALLOUT_TITLE = i18n.translate(
  'xpack.synthetics.monitorManagement.scalableLocationCallout.title',
  {
    defaultMessage: 'Scalable private location',
  }
);
