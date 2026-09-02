/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiSpacer, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFormContext, Controller } from 'react-hook-form';
import { AGENT_SHARDING_MIN_LICENSE } from '../../../../../../common/constants/license';
import { useLicense } from '../../../hooks/use_license';
import type { PrivateLocation } from '../../../../../../common/runtime_types';

export const AgentShardingField = ({
  isEditingShardedLocation,
}: {
  isEditingShardedLocation: boolean;
}) => {
  const { control } = useFormContext<PrivateLocation>();
  const { hasAtLeast } = useLicense();
  const canEnable = hasAtLeast(AGENT_SHARDING_MIN_LICENSE) === true;

  if (!canEnable && !isEditingShardedLocation) {
    return null;
  }

  return (
    <>
      <EuiSpacer />
      <EuiFormRow fullWidth helpText={AGENT_SHARDING_HELP}>
        <Controller
          name="isAgentSharding"
          control={control}
          render={({ field }) => (
            <EuiSwitch
              data-test-subj="syntheticsLocationAgentShardingSwitch"
              label={AGENT_SHARDING_LABEL}
              checked={Boolean(field.value)}
              disabled={!canEnable && !field.value}
              onChange={(e) => field.onChange(e.target.checked)}
            />
          )}
        />
      </EuiFormRow>
    </>
  );
};

const AGENT_SHARDING_LABEL = i18n.translate(
  'xpack.synthetics.privateLocation.agentSharding.switchLabel',
  {
    defaultMessage: 'Scale across multiple agents',
  }
);

const AGENT_SHARDING_HELP = i18n.translate(
  'xpack.synthetics.privateLocation.agentSharding.switchHelp',
  {
    defaultMessage:
      'Distribute monitors across agents on this policy so only one agent runs each monitor. Requires an Enterprise license.',
  }
);
