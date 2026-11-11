/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { css } from '@emotion/react';
import { EuiButton, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useAgentBuilderAvailability } from '../../../../../../agent_builder/hooks/use_agent_builder_availability';
import type { CallOutMessage } from '../../../../../../common/components/callouts';
import { CallOutSwitcher } from '../../../../../../common/components/callouts';
import { useKibana } from '../../../../../../common/lib/kibana';

interface ConfigurationTroubleshootingSunsetCalloutProps {
  hostName: string;
  agentId: string;
}

export const ConfigurationTroubleshootingSunsetCallout = ({
  hostName,
  agentId,
}: ConfigurationTroubleshootingSunsetCalloutProps) => {
  const { euiTheme } = useEuiTheme();
  const { agentBuilder } = useKibana().services;
  const { isAgentBuilderEnabled } = useAgentBuilderAvailability();
  const canOpenAgentBuilder = isAgentBuilderEnabled && Boolean(agentBuilder?.openChat);
  const handleClick = useCallback(() => {
    agentBuilder?.openChat?.({
      newConversation: true,
      sessionTag: 'security',
      initialMessage: i18n.translate(
        'xpack.securitySolution.endpoint.details.configurationTroubleshootingSunset.initialMessageDescription',
        {
          defaultMessage: 'Troubleshoot Elastic Defend on host {hostName} (agent ID {agentId}).',
          values: { hostName, agentId },
        }
      ),
      autoSendInitialMessage: false,
    });
  }, [agentBuilder, hostName, agentId]);
  const message: CallOutMessage = {
    type: 'primary',
    id: 'configuration-troubleshooting-sunset',
    title: i18n.translate(
      'xpack.securitySolution.endpoint.details.configurationTroubleshootingSunset.calloutTitle',
      { defaultMessage: 'Automatic Troubleshooting moved to Agent Builder' }
    ),
    description: (
      <>
        <p>
          {canOpenAgentBuilder ? (
            <FormattedMessage
              id="xpack.securitySolution.endpoint.details.configurationTroubleshootingSunset.calloutDescription"
              defaultMessage="To troubleshoot Elastic Defend on this host, ask Agent Builder."
            />
          ) : (
            <FormattedMessage
              id="xpack.securitySolution.endpoint.details.configurationTroubleshootingSunset.calloutDescriptionNoAgentBuilder"
              defaultMessage="Automatic Troubleshooting is now only available in Agent Builder. Ask your administrator for access."
            />
          )}
        </p>
        {canOpenAgentBuilder && (
          <EuiButton
            fill
            color="primary"
            onClick={handleClick}
            css={css({ marginInlineEnd: euiTheme.size.s })}
          >
            <FormattedMessage
              id="xpack.securitySolution.endpoint.details.configurationTroubleshootingSunset.openAgentBuilderLinkText"
              defaultMessage="Open Agent Builder"
            />
          </EuiButton>
        )}
      </>
    ),
  };

  return <CallOutSwitcher namespace="endpointDetails" condition={true} message={message} />;
};
