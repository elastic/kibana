/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiShowFor,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { openWiredConnectionDetails } from '@kbn/cloud/connection_details';

interface CompactApiKeysProps {
  telemetryPage: string;
}

export const CompactApiKeys = ({ telemetryPage }: CompactApiKeysProps) => {
  const telemetryPrefix = `vectordbOnboarding-${telemetryPage}`;

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiShowFor sizes={['xl']}>
        <EuiFlexItem>
          <EuiButton
            data-test-subj="vectordbConnectToProjectApiKeysButton"
            data-telemetry-id={`${telemetryPrefix}-apiKeys-btn`}
            color="text"
            iconType="plusCircle"
            size="s"
            onClick={() =>
              openWiredConnectionDetails({
                props: { options: { defaultTabId: 'apiKeys' } },
              })
            }
          >
            <FormattedMessage
              id="vectordbOnboarding.connectToProject.apiKeysButtonLabel"
              defaultMessage="API keys"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiShowFor>
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={i18n.translate('vectordbOnboarding.connectToProject.connectionDetailsTooltip', {
            defaultMessage: 'Connection details',
          })}
        >
          <EuiButtonIcon
            display="base"
            size="s"
            iconSize="m"
            iconType="plugs"
            onClick={() => openWiredConnectionDetails()}
            data-test-subj="vectordbConnectToProjectConnectionDetailsButton"
            data-telemetry-id={`${telemetryPrefix}-connectionDetails-btn`}
            color="text"
            aria-label={i18n.translate(
              'vectordbOnboarding.connectToProject.connectionDetailsAriaLabel',
              {
                defaultMessage: 'Show connection details for connecting to the Elasticsearch API',
              }
            )}
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
