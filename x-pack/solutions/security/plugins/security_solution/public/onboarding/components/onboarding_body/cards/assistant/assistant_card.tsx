/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink } from '@elastic/eui';
import { css } from '@emotion/css';
import { OnboardingCardId } from '../../../../constants';
import type { OnboardingCardComponent } from '../../../../types';
import * as i18n from './translations';
import { OnboardingCardContentPanel } from '../common/card_content_panel';
import { ConnectorCards } from '../common/connectors/connector_cards';
import { CardCallOut } from '../common/card_callout';
import { CardSubduedText } from '../common/card_subdued_text';
import type { AssistantCardMetadata } from './types';
import { MissingPrivilegesCallOut } from '../common/connectors/missing_privileges';

export const AssistantCard: OnboardingCardComponent<AssistantCardMetadata> = ({
  isCardComplete,
  setExpandedCardId,
  checkCompleteMetadata,
  checkComplete,
  isCardAvailable,
}) => {
  const isIntegrationsCardComplete = useMemo(
    () => isCardComplete(OnboardingCardId.integrations),
    [isCardComplete]
  );

  const isIntegrationsCardAvailable = useMemo(
    () => isCardAvailable(OnboardingCardId.integrations),
    [isCardAvailable]
  );

  const expandIntegrationsCard = useCallback(() => {
    setExpandedCardId(OnboardingCardId.integrations, { scroll: true });
  }, [setExpandedCardId]);

  const connectors = checkCompleteMetadata?.connectors;
  const canExecuteConnectors = checkCompleteMetadata?.canExecuteConnectors;
  const canCreateConnectors = checkCompleteMetadata?.canCreateConnectors;

  return (
    <OnboardingCardContentPanel>
      {canExecuteConnectors ? (
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <CardSubduedText size="s">{i18n.ASSISTANT_CARD_DESCRIPTION}</CardSubduedText>
          </EuiFlexItem>
          <EuiFlexItem>
            {isIntegrationsCardAvailable && !isIntegrationsCardComplete ? (
              <EuiFlexItem
                className={css`
                  width: 45%;
                `}
              >
                <CardCallOut
                  color="primary"
                  icon="iInCircle"
                  text={i18n.ASSISTANT_CARD_CALLOUT_INTEGRATIONS_TEXT}
                  action={
                    <EuiLink onClick={expandIntegrationsCard}>
                      <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
                        <EuiFlexItem>{i18n.ASSISTANT_CARD_CALLOUT_INTEGRATIONS_BUTTON}</EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiIcon type="arrowRight" color="primary" size="s" />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiLink>
                  }
                />
              </EuiFlexItem>
            ) : (
              <ConnectorCards
                canCreateConnectors={canCreateConnectors}
                connectors={connectors}
                onConnectorSaved={checkComplete}
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <MissingPrivilegesCallOut />
      )}
    </OnboardingCardContentPanel>
  );
};

// eslint-disable-next-line import/no-default-export
export default AssistantCard;
