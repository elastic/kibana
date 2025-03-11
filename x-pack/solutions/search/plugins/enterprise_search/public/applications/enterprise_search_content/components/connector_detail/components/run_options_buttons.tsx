/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiCheckableCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export interface RunOptionsButtonsProps {
  selectDeploymentMethod: (method: 'docker' | 'source') => void;
  selectedDeploymentMethod: 'docker' | 'source' | null;
}

export const RunOptionsButtons: React.FC<RunOptionsButtonsProps> = ({
  selectDeploymentMethod,
  selectedDeploymentMethod,
}) => {
  return (
    <>
      <EuiSpacer size="s" />
      <EuiText size="s">
        <FormattedMessage
          id="xpack.enterpriseSearch.content.connector_detail.configurationConnector.steps.description"
          defaultMessage="The connector service is a Python package that you host on your own infrastructure. You can deploy with Docker or, optionally, run from source."
        />
        <EuiSpacer />
        <EuiFlexGroup direction="row">
          <EuiFlexItem>
            <EuiCheckableCard
              onChange={() => selectDeploymentMethod('docker')}
              id="xpack.enterpriseSearch.content.connector_detail.configurationConnector.steps.runConnectorService.docker"
              checked={selectedDeploymentMethod === 'docker'}
              aria-label={i18n.translate(
                'xpack.enterpriseSearch.connectorConfiguration.dockerTextLabel.ariaLabel',
                { defaultMessage: 'Run with Docker' }
              )}
              name="deployment-method-run-connector"
              label={
                <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="logoDocker" size="l" />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText>
                      {i18n.translate(
                        'xpack.enterpriseSearch.connectorConfiguration.dockerTextLabel',
                        { defaultMessage: 'Run with Docker' }
                      )}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCheckableCard
              onChange={() => selectDeploymentMethod('source')}
              id="xpack.enterpriseSearch.content.connector_detail.configurationConnector.steps.runConnectorService.source"
              checked={selectedDeploymentMethod === 'source'}
              aria-label={i18n.translate(
                'xpack.enterpriseSearch.connectorConfiguration.sourceTextLabel.ariaLabel',
                { defaultMessage: 'Run from source' }
              )}
              name="deployment-method-run-connector"
              label={
                <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="logoGithub" size="l" />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText>
                      {i18n.translate(
                        'xpack.enterpriseSearch.connectorConfiguration.sourceTextLabel',
                        { defaultMessage: 'Run from source' }
                      )}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiText>
    </>
  );
};
