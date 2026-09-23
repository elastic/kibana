/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import {
  EuiCallOut,
  EuiConfirmModal,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { AGENT_SHARDING_MIN_LICENSE } from '../../../../../../common/constants/license';
import { useLicense } from '../../../hooks/use_license';
import type { PrivateLocation } from '../../../../../../common/runtime_types';
import type { ClientPluginsStart } from '../../../../../plugin';

export const AGENT_SHARDING_FIELD_NAME = 'isAgentSharding';

export const AgentShardingField = ({
  isEditingShardedLocation,
}: {
  isEditingShardedLocation: boolean;
}) => {
  const { control } = useFormContext<PrivateLocation>();
  const { hasAtLeast } = useLicense();
  const { cloud } = useKibana<ClientPluginsStart>().services;
  const canEnable = hasAtLeast(AGENT_SHARDING_MIN_LICENSE) === true;
  const isForced = canEnable && Boolean(cloud?.isCloudEnabled);
  const isAgentSharding =
    useWatch({ control, name: AGENT_SHARDING_FIELD_NAME }) === true || isForced;
  const [isConfirmingDisable, setIsConfirmingDisable] = useState(false);
  const confirmTitleId = useGeneratedHtmlId();

  if (!canEnable && !isEditingShardedLocation) {
    return null;
  }

  return (
    <>
      <Controller
        name={AGENT_SHARDING_FIELD_NAME}
        control={control}
        render={({ field }) => (
          <>
            <EuiSwitch
              data-test-subj="syntheticsAgentShardingSwitch"
              label={AGENT_SHARDING_TOGGLE_SWITCH}
              checked={Boolean(field.value) || isForced}
              disabled={isForced}
              onChange={(event) => {
                if (isEditingShardedLocation && field.value && !event.target.checked) {
                  setIsConfirmingDisable(true);
                  return;
                }
                field.onChange(event.target.checked);
              }}
            />
            {isConfirmingDisable && (
              <EuiConfirmModal
                aria-labelledby={confirmTitleId}
                title={DISABLE_SHARDING_CONFIRM_TITLE}
                titleProps={{ id: confirmTitleId }}
                data-test-subj="syntheticsDisableAgentShardingConfirmModal"
                onCancel={() => setIsConfirmingDisable(false)}
                onConfirm={() => {
                  field.onChange(false);
                  setIsConfirmingDisable(false);
                }}
                cancelButtonText={DISABLE_SHARDING_CONFIRM_CANCEL}
                confirmButtonText={DISABLE_SHARDING_CONFIRM_BUTTON}
                buttonColor="warning"
                defaultFocusedButton="confirm"
              >
                <p>{DISABLE_SHARDING_CONFIRM_MESSAGE}</p>
              </EuiConfirmModal>
            )}
          </>
        )}
      />
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        {isForced ? AGENT_SHARDING_FORCED_HELP_DESCRIPTION : AGENT_SHARDING_HELP_DESCRIPTION}
      </EuiText>
      {isAgentSharding && (
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

const AGENT_SHARDING_FORCED_HELP_DESCRIPTION = i18n.translate(
  'xpack.synthetics.monitorManagement.agentShardingForcedHelpDescription',
  {
    defaultMessage:
      'Always on for Enterprise deployments on Elastic Cloud. Kibana shards monitors across the agents on this policy for at-most-once execution and failover.',
  }
);

const AGENT_SHARDING_CALLOUT_TITLE = i18n.translate(
  'xpack.synthetics.monitorManagement.agentShardingCalloutTitle',
  {
    defaultMessage: 'Condition-based sharding',
  }
);

const DISABLE_SHARDING_CONFIRM_TITLE = i18n.translate(
  'xpack.synthetics.monitorManagement.disableAgentShardingConfirmTitle',
  {
    defaultMessage: 'Turn off scalable location?',
  }
);

const DISABLE_SHARDING_CONFIRM_MESSAGE = i18n.translate(
  'xpack.synthetics.monitorManagement.disableAgentShardingConfirmMessage',
  {
    defaultMessage:
      'Kibana will rewrite every monitor on this location and clear per-monitor agent conditions. Each monitor will then run on every agent enrolled on this policy.',
  }
);

const DISABLE_SHARDING_CONFIRM_BUTTON = i18n.translate(
  'xpack.synthetics.monitorManagement.disableAgentShardingConfirmButton',
  {
    defaultMessage: 'Turn off',
  }
);

const DISABLE_SHARDING_CONFIRM_CANCEL = i18n.translate(
  'xpack.synthetics.monitorManagement.disableAgentShardingConfirmCancel',
  {
    defaultMessage: 'Cancel',
  }
);
