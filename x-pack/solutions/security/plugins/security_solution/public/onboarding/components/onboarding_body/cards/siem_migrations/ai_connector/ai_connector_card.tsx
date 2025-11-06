/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { CenteredLoadingSpinner } from '../../../../../../common/components/centered_loading_spinner';
import { useKibana } from '../../../../../../common/lib/kibana/kibana_react';
import type { OnboardingCardComponent } from '../../../../../types';
import * as i18n from './translations';
import { OnboardingCardContentPanel } from '../../common/card_content_panel';
import { ConnectorCards } from '../../common/connectors/connector_cards';
import { CardSubduedText } from '../../common/card_subdued_text';
import { ConnectorsMissingPrivilegesCallOut } from '../../common/connectors/missing_privileges';
import type { AIConnector } from '../../common/connectors/types';
import type { AIConnectorCardMetadata } from './types';
import { useDefinedLocalStorage } from '../../../../../../common/lib/integrations/hooks/use_stored_state';

const LlmPerformanceMatrixDocsLink = React.memo<{ text: string }>(({ text }) => {
  const { llmPerformanceMatrix } = useKibana().services.docLinks.links.securitySolution;
  return (
    <EuiLink href={llmPerformanceMatrix} target="_blank">
      {text}
    </EuiLink>
  );
});
LlmPerformanceMatrixDocsLink.displayName = 'LlmPerformanceMatrixDocsLink';

const SiemMigrationDocsLink = React.memo<{ text: string }>(({ text }) => {
  const { siemMigrations } = useKibana().services.docLinks.links.securitySolution;
  return (
    <EuiLink href={siemMigrations} target="_blank">
      {text}
    </EuiLink>
  );
});
SiemMigrationDocsLink.displayName = 'SiemMigrationDocsLink';

export const AIConnectorCard: OnboardingCardComponent<AIConnectorCardMetadata> = ({
  checkCompleteMetadata,
  checkComplete,
  setComplete,
}) => {
  const { siemMigrations } = useKibana().services;
  const [storedConnectorId, setStoredConnectorId] = useDefinedLocalStorage<string | undefined>(
    siemMigrations.rules.connectorIdStorage.key,
    undefined
  );

  const setSelectedConnector = useCallback(
    (connector: AIConnector) => {
      setStoredConnectorId(connector.id);
      setComplete(true);
      siemMigrations.rules.telemetry.reportConnectorSelected({ connector });
    },
    [setComplete, setStoredConnectorId, siemMigrations]
  );

  const isInferenceConnector = useMemo(() => {
    if (!checkCompleteMetadata?.connectors?.length || !storedConnectorId) {
      return false;
    }
    const connector = checkCompleteMetadata.connectors.find((c) => c.id === storedConnectorId);
    return connector?.actionTypeId === '.inference';
  }, [checkCompleteMetadata, storedConnectorId]);

  if (!checkCompleteMetadata) {
    return (
      <OnboardingCardContentPanel>
        <CenteredLoadingSpinner />
      </OnboardingCardContentPanel>
    );
  }

  const { connectors, canExecuteConnectors, canCreateConnectors } = checkCompleteMetadata;

  return (
    <OnboardingCardContentPanel>
      {canExecuteConnectors ? (
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <CardSubduedText size="s">
              {i18n.AI_CONNECTOR_CARD_DESCRIPTION_START}
              {isInferenceConnector ? (
                <FormattedMessage
                  id="xpack.securitySolution.onboarding.aiConnectorCardInferenceDescription"
                  defaultMessage="The Elastic-provided connector is selected by default. You can configure another connector and model if you prefer. Learn more about {docsLink} and {llmMatrixLink}"
                  values={{
                    llmMatrixLink: <LlmPerformanceMatrixDocsLink text={i18n.LLM_MATRIX_LINK} />,
                    docsLink: <SiemMigrationDocsLink text={i18n.AI_POWERED_MIGRATIONS_LINK} />,
                  }}
                />
              ) : (
                <FormattedMessage
                  id="xpack.securitySolution.onboarding.aiConnectorCardNotInferenceDescription"
                  defaultMessage="Refer to the {llmMatrixLink} for information about which models perform best. {docsLink} about AI-powered SIEM migration."
                  values={{
                    llmMatrixLink: <LlmPerformanceMatrixDocsLink text={i18n.LLM_MATRIX_LINK} />,
                    docsLink: <SiemMigrationDocsLink text={i18n.LEARN_MORE_LINK} />,
                  }}
                />
              )}
            </CardSubduedText>
          </EuiFlexItem>
          <EuiFlexItem>
            <ConnectorCards
              canCreateConnectors={canCreateConnectors}
              connectors={connectors}
              onNewConnectorSaved={checkComplete}
              selectedConnectorId={storedConnectorId}
              onConnectorSelected={setSelectedConnector}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <ConnectorsMissingPrivilegesCallOut level="read" />
      )}
    </OnboardingCardContentPanel>
  );
};

// eslint-disable-next-line import/no-default-export
export default AIConnectorCard;
