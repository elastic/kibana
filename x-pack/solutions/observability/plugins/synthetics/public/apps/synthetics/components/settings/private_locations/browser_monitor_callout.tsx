/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiCode, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { AGENT_CALLOUT_TITLE } from './location_form';

export const BrowserMonitorCallout: React.FC = () => {
  return (
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
  );
};
