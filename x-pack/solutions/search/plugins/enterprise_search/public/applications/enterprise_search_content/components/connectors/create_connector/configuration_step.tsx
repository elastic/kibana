/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiButton,
  EuiProgress,
  EuiCallOut,
  EuiLoadingSpinner,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import { ConnectorConfigurationComponent, ConnectorStatus } from '@kbn/search-connectors';

import { Status } from '../../../../../../common/types/api';

import * as Constants from '../../../../shared/constants';
import { ConnectorConfigurationApiLogic } from '../../../api/connector/update_connector_configuration_api_logic';
import { ConnectorViewLogic } from '../../connector_detail/connector_view_logic';
import { NewConnectorLogic } from '../../new_index/method_connector/new_connector_logic';

interface ConfigurationStepProps {
  setCurrentStep: Function;
  title: string;
}

export const ConfigurationStep: React.FC<ConfigurationStepProps> = ({ title, setCurrentStep }) => {
  const { connector, isWaitingOnAgentlessDeployment } = useValues(ConnectorViewLogic);
  const { updateConnectorConfiguration } = useActions(ConnectorViewLogic);
  const { setFormDirty } = useActions(NewConnectorLogic);
  const { overlays } = useKibana().services;
  const [isFormEditing, setIsFormEditing] = useState<boolean>(false);
  const { status } = useValues(ConnectorConfigurationApiLogic);
  const isSyncing = false;

  const isConnectorConfigured =
    connector?.status === ConnectorStatus.CONNECTED ||
    connector?.status === ConnectorStatus.CONFIGURED;

  const isNextStepEnabled = !isWaitingOnAgentlessDeployment && isConnectorConfigured;

  useEffect(() => {
    setTimeout(() => {
      window.scrollTo({
        behavior: 'smooth',
        top: 0,
      });
    }, 100);
  }, []);

  if (!connector) return null;

  return (
    <>
      <EuiFlexGroup gutterSize="m" direction="column">
        {isWaitingOnAgentlessDeployment && (
          <EuiCallOut
            announceOnMount
            color="warning"
            title={
              <EuiFlexGroup alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner />
                </EuiFlexItem>
                <EuiFlexItem>
                  {i18n.translate(
                    'xpack.enterpriseSearch.createConnector.configurationStep.agentlessDeploymentNotReadyCallOut.title',
                    {
                      defaultMessage: 'Provisioning infrastructure',
                    }
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          >
            <EuiSpacer size="s" />
            <EuiText size="s">
              {i18n.translate(
                'xpack.enterpriseSearch.createConnector.configurationStep.agentlessDeploymentNotReadyCallOut.description',
                {
                  defaultMessage:
                    'Setting up the agentless infrastructure to run the connector. This process may take up to one minute.',
                }
              )}
            </EuiText>
          </EuiCallOut>
        )}
        <EuiFlexItem>
          <EuiPanel hasShadow={false} hasBorder paddingSize="l" style={{ position: 'relative' }}>
            <EuiTitle size="m">
              <h3>{title}</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <ConnectorConfigurationComponent
              connector={connector}
              hasPlatinumLicense
              isLoading={status === Status.LOADING}
              saveConfig={(config) => {
                updateConnectorConfiguration({
                  configuration: config,
                  connectorId: connector.id,
                });
              }}
              onEditStateChange={setIsFormEditing}
            />
            <EuiSpacer size="m" />
            {isSyncing && (
              <EuiProgress size="xs" position="absolute" style={{ top: 'calc(100% - 2px)' }} />
            )}
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel hasShadow={false} hasBorder paddingSize="l" color="plain">
            <EuiText>
              <h3>
                {i18n.translate(
                  'xpack.enterpriseSearch.createConnector.configurationStep.h4.finishUpLabel',
                  {
                    defaultMessage: 'Finish up',
                  }
                )}
              </h3>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiText color={isNextStepEnabled ? 'default' : 'subdued'} size="s">
              <p>
                {i18n.translate(
                  'xpack.enterpriseSearch.createConnector.configurationStep.p.description',
                  {
                    defaultMessage:
                      'You can manually sync your data, schedule a recurring sync or manage your domains.',
                  }
                )}
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiButton
              disabled={!isNextStepEnabled}
              data-test-subj="enterpriseSearchStartStepGenerateConfigurationButton"
              onClick={async () => {
                if (isFormEditing) {
                  const confirmResponse = await overlays?.openConfirm(
                    i18n.translate('xpack.enterpriseSearch.configureConnector.unsavedPrompt.body', {
                      defaultMessage:
                        'You are still editing connector configuration, are you sure you want to continue without saving? You can complete the setup later in the connector configuration page, but this guided flow offers more help.',
                    }),
                    {
                      title: i18n.translate(
                        'xpack.enterpriseSearch.configureConnector.unsavedPrompt.title',
                        {
                          defaultMessage: 'Connector configuration is not saved',
                        }
                      ),
                      cancelButtonText: i18n.translate(
                        'xpack.enterpriseSearch.configureConnector.unsavedPrompt.cancel',
                        {
                          defaultMessage: 'Continue setup',
                        }
                      ),
                      confirmButtonText: i18n.translate(
                        'xpack.enterpriseSearch.configureConnector.unsavedPrompt.confirm',
                        {
                          defaultMessage: 'Leave the page',
                        }
                      ),
                    }
                  );
                  if (!confirmResponse) {
                    return;
                  }
                }
                setFormDirty(false);
                setCurrentStep('finish');
              }}
              fill
            >
              {Constants.NEXT_BUTTON_LABEL}
            </EuiButton>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
