/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { AGENT_MISSING_CALLOUT_TITLE } from './location_form';

export const AgentPolicyCallout: React.FC = () => {
  return (
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
  );
};
