/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiText,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useEffect, useState } from 'react';
import { GenerativeAIForSearchPlaygroundConnectorFeatureId } from '@kbn/actions-plugin/common';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../hooks/use_kibana';
import { useLoadConnectors } from '../../hooks/use_load_connectors';
import { useUsageTracker } from '../../hooks/use_usage_tracker';
import { AnalyticsEvents } from '../../analytics/constants';
import { LLMs } from '../../../common/types';

export const ConnectLLMButton: React.FC = () => {
  const [connectorFlyoutOpen, setConnectorFlyoutOpen] = useState(false);
  const [showCallout, setShowAddedCallout] = useState(false);
  const {
    services: {
      triggersActionsUi: { getAddConnectorFlyout: ConnectorFlyout },
    },
  } = useKibana();
  const { data: connectors, refetch: refetchConnectors } = useLoadConnectors();
  const usageTracker = useUsageTracker();
  const handleConnectorCreated = () => {
    refetchConnectors();
    setShowAddedCallout(true);
    setConnectorFlyoutOpen(false);
  };
  const handleSetupGenAiConnector = () => {
    usageTracker?.click(AnalyticsEvents.genAiConnectorCreated);
    setConnectorFlyoutOpen(true);
  };

  useEffect(() => {
    if (connectors?.length) {
      if (showCallout) {
        usageTracker?.load(AnalyticsEvents.genAiConnectorAdded);
      } else {
        usageTracker?.load(AnalyticsEvents.genAiConnectorExists);
      }
    } else {
      usageTracker?.load(AnalyticsEvents.genAiConnectorSetup);
    }
  }, [connectors?.length, showCallout, usageTracker]);

  return (
    <>
      {connectors?.length ? (
        <EuiFlexGroup alignItems="center" gutterSize="s" data-test-subj="successConnectLLMText">
          <EuiFlexItem grow={false}>
            <EuiIcon type="checkInCircleFilled" color="success" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText color="success">
              {connectors.some((connector) => connector.type === LLMs.inference) ? (
                <FormattedMessage
                  id="xpack.searchPlayground.setupPage.elasticManagedLlmConnectedButtonLabel"
                  defaultMessage="{connectorName} connected"
                  values={{
                    connectorName:
                      connectors.filter((connector) => connector.type === LLMs.inference)[0]
                        ?.name || 'Elastic Managed LLM',
                  }}
                />
              ) : (
                <FormattedMessage
                  id="xpack.searchPlayground.setupPage.llmConnectedButtonLabel"
                  defaultMessage="{connectorName} connected"
                  values={{ connectorName: connectors[0]?.name || 'LLM' }}
                />
              )}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              target="_blank"
              data-test-subj="manageConnectorsLink"
              iconType="wrench"
              size="s"
              onClick={handleSetupGenAiConnector}
              aria-label={i18n.translate('xpack.searchPlayground.setupPage.manageConnectorLink', {
                defaultMessage: 'Manage connector',
              })}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <EuiButton
          iconType="sparkles"
          data-test-subj="connectLLMButton"
          onClick={handleSetupGenAiConnector}
        >
          <FormattedMessage
            id="xpack.searchPlayground.setupPage.connectLLMButtonLabel"
            defaultMessage="Connect to an LLM"
          />
        </EuiButton>
      )}
      {connectorFlyoutOpen && (
        <ConnectorFlyout
          featureId={GenerativeAIForSearchPlaygroundConnectorFeatureId}
          onConnectorCreated={handleConnectorCreated}
          onClose={() => setConnectorFlyoutOpen(false)}
        />
      )}
    </>
  );
};
