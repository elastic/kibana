/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { MIN_MW_SUPPORTED_AGENT_VERSION } from '../../../../../../common/utils/agent_mw_support';

/** Shared with the standalone {@link MwsAgentVersionCallout} for the case with no active/pending callout to fold into. */
export const AgentVersionWarningText = () => (
  <FormattedMessage
    id="xpack.synthetics.maintenanceWindowCallout.agentVersionWarningLine"
    defaultMessage="One or more agents predate {minVersion} — this maintenance window may not be honored."
    values={{ minVersion: MIN_MW_SUPPORTED_AGENT_VERSION }}
  />
);

/**
 * Second line folded into an existing MW callout (active or pending-sync)
 * rather than a standalone callout, to keep each surface to one box.
 */
export const MwsAgentVersionWarningLine = () => (
  <>
    <EuiSpacer size="m" />
    <EuiText size="xs" data-test-subj="maintenanceWindowAgentVersionWarningLine">
      <strong>
        <AgentVersionWarningText />
      </strong>
    </EuiText>
  </>
);
