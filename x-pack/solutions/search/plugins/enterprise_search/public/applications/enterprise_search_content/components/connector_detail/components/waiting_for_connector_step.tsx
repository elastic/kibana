/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton, EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface WaitingForConnectorStepProps {
  isLoading: boolean;
  isRecheckDisabled: boolean;
  recheck: () => void;
  showFinishLaterButton?: boolean;
}
export const WaitingForConnectorStep: React.FC<WaitingForConnectorStepProps> = ({
  recheck,
  isLoading,
  isRecheckDisabled,
  showFinishLaterButton = false,
}) => {
  return (
    <>
      <EuiSpacer />
      <EuiCallOut
        color="warning"
        title={i18n.translate(
          'xpack.enterpriseSearch.content.connector_detail.configurationConnector.steps.waitingForConnector.callout.title',
          {
            defaultMessage: 'Waiting for your connector',
          }
        )}
        iconType="iInCircle"
      >
        {i18n.translate(
          'xpack.enterpriseSearch.content.connector_detail.configurationConnector.steps.waitingForConnector.callout.description',
          {
            defaultMessage:
              'Your connector has not connected to Search. Troubleshoot your configuration and refresh the page.',
          }
        )}
        <EuiSpacer size="s" />
        <EuiFlexGroup direction="row" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButton
              color="warning"
              fill
              disabled={isRecheckDisabled}
              data-test-subj="entSearchContent-connector-waitingForConnector-callout-recheckNow"
              data-telemetry-id="entSearchContent-connector-waitingForConnector-callout-recheckNow"
              iconType="refresh"
              onClick={recheck}
              isLoading={isLoading}
            >
              {i18n.translate(
                'xpack.enterpriseSearch.content.connector_detail.configurationConnector.steps.waitingForConnector.callout.button.label',
                {
                  defaultMessage: 'Recheck now',
                }
              )}
            </EuiButton>
          </EuiFlexItem>
          {showFinishLaterButton && (
            <EuiFlexItem grow={false}>
              <EuiButton
                color="warning"
                data-test-subj="entSearchContent-connector-waitingForConnector-callout-finishLaterButton"
                data-telemetry-id="entSearchContent-connector-waitingForConnector-callout-finishLaterButton"
                iconType="save"
                onClick={() => {}}
              >
                {i18n.translate(
                  'xpack.enterpriseSearch.content.connector_detail.configurationConnector.steps.waitingForConnector.callout.finishLaterButton.label',
                  {
                    defaultMessage: 'Finish deployment later',
                  }
                )}
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiCallOut>
    </>
  );
};
