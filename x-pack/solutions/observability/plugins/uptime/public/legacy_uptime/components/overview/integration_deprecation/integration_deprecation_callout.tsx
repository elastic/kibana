/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { getDocLinks } from '../../../../kibana_services';

interface IntegrationDeprecationCalloutProps {
  handleDismissDeprecationNotice?: () => void;
}

export function IntegrationDeprecationCallout({
  handleDismissDeprecationNotice,
}: IntegrationDeprecationCalloutProps) {
  return (
    <EuiCallOut
      title={
        <FormattedMessage
          id="xpack.uptime.integration.deprecation.title"
          defaultMessage="Migrate your Elastic Synthetics integration monitors"
        />
      }
      color="warning"
    >
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem>
          <span>
            <FormattedMessage
              id="xpack.uptime.integration.deprecation.content"
              defaultMessage="You have at least one monitor configured using the Elastic Synthetics integration. From Elastic 8.8, the integration is deprecated and you can no longer edit these monitors. Please migrate them to Project monitors or add them to the new Synthetics app directly available in Observability. Check our {link} for more details."
              values={{
                link: (
                  <EuiLink
                    data-test-subj="syntheticsIntegrationDeprecationCalloutSyntheticsMigrationDocsLink"
                    target="_blank"
                    href={getDocLinks()?.links?.observability?.syntheticsMigrateFromIntegration}
                    external
                  >
                    <FormattedMessage
                      id="xpack.uptime.integration.deprecation.link"
                      defaultMessage="Synthetics migration docs"
                    />
                  </EuiLink>
                ),
              }}
            />
          </span>
        </EuiFlexItem>
        {handleDismissDeprecationNotice ? (
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="syntheticsIntegrationDeprecationCalloutDismissButton"
              onClick={handleDismissDeprecationNotice}
              color="warning"
            >
              <FormattedMessage
                id="xpack.uptime.integration.deprecation.dismiss"
                defaultMessage="Dismiss"
              />
            </EuiButton>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </EuiCallOut>
  );
}
