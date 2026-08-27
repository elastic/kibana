/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { EuiCallOut, EuiSpacer, EuiSwitch, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { AGENT_SHARDING_MIN_LICENSE } from '../../../../../../common/constants/license';
import { useLicense } from '../../../hooks/use_license';
import type { PrivateLocation } from '../../../../../../common/runtime_types';

export const AGENT_SHARDING_FIELD_NAME = 'isAgentSharding';

export const AgentShardingField = ({
  isEditingShardedLocation,
}: {
  isEditingShardedLocation: boolean;
}) => {
  const { control } = useFormContext<PrivateLocation>();
  const isAgentSharding = useWatch({ control, name: AGENT_SHARDING_FIELD_NAME });
  const { hasAtLeast } = useLicense();
  const canEnable = hasAtLeast(AGENT_SHARDING_MIN_LICENSE) === true;

  if (!canEnable && !isEditingShardedLocation) {
    return null;
  }

  return (
    <>
      <Controller
        name={AGENT_SHARDING_FIELD_NAME}
        control={control}
        render={({ field }) => (
          <EuiSwitch
            data-test-subj="syntheticsAgentShardingSwitch"
            label={AGENT_SHARDING_TOGGLE_SWITCH}
            checked={Boolean(field.value)}
            disabled={!canEnable && !field.value}
            onChange={(event) => field.onChange(event.target.checked)}
          />
        )}
      />
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        {AGENT_SHARDING_HELP_DESCRIPTION}
      </EuiText>
      {Boolean(isAgentSharding) && (
        <>
          <EuiSpacer />
          <EuiCallOut
            announceOnMount
            data-test-subj="syntheticsAgentShardingCallout"
            title={AGENT_SHARDING_CALLOUT_TITLE}
            size="s"
            color="primary"
            iconType="cluster"
            text={
              <p>
                <FormattedMessage
                  id="xpack.synthetics.monitorManagement.agentShardingCalloutDescription"
                  defaultMessage="Enroll multiple agents into this single policy. Kibana distributes monitors across them with a per-monitor agent condition, so each monitor runs on exactly one agent and moves to a healthy agent on failover."
                />
              </p>
            }
          />
        </>
      )}
    </>
  );
};

const AGENT_SHARDING_TOGGLE_SWITCH = i18n.translate(
  'xpack.synthetics.monitorManagement.agentShardingToggleSwitch',
  {
    defaultMessage: 'Scale with multiple agents on this policy',
  }
);

const AGENT_SHARDING_HELP_DESCRIPTION = i18n.translate(
  'xpack.synthetics.monitorManagement.agentShardingHelpDescription',
  {
    defaultMessage:
      'Run several agents under this one policy and let Kibana shard monitors across them for at-most-once execution and failover. Requires an Enterprise license.',
  }
);

const AGENT_SHARDING_CALLOUT_TITLE = i18n.translate(
  'xpack.synthetics.monitorManagement.agentShardingCalloutTitle',
  {
    defaultMessage: 'Condition-based sharding',
  }
);
