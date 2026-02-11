/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiTextArea,
  EuiButtonIcon,
  useEuiTheme,
  euiShadow,
  euiShadowHover,
  type UseEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { AGENT_BUILDER_APP_ID } from '@kbn/deeplinks-agent-builder';
import { AGENT_BUILDER_CONVERSATIONS_NEW_PATH } from '../../../common';
import { useKibana } from '../hooks/use_kibana';
import { useAgents } from '../hooks/use_agents';
import { AgentSelector } from './agent_selector/agent_selector';
import { ConnectorSelector } from './connector_selector/connector_selector';

const INPUT_MIN_HEIGHT = '150px';

const titleStyles = { fontWeight: 400 };

const titleContainerStyles = { width: '100%' };

const fullWidthStyles = { width: '100%' };

const getInputContainerStyles = (euiThemeContext: UseEuiTheme) => {
  const { euiTheme } = euiThemeContext;
  return css`
    width: 100%;
    min-height: ${INPUT_MIN_HEIGHT};
    padding: ${euiTheme.size.base};
    flex-grow: 0;
    transition: box-shadow 250ms;
    background-color: ${euiTheme.colors.backgroundBasePlain};
    border: none;

    ${euiShadow(euiThemeContext, 's')}
    &:hover {
      ${euiShadowHover(euiThemeContext, 's')}
    }
    &:focus-within {
      ${euiShadow(euiThemeContext, 'xl')}
      :hover {
        ${euiShadowHover(euiThemeContext, 'xl')}
      }
    }
  `;
};

const textAreaStyles = css`
  && {
    border: none;
    box-shadow: none;
    outline: none;
    padding: 0;
    resize: none;
  }
  &&:focus {
    border: none;
    box-shadow: none;
    outline: none;
    background-image: none;
  }
`;

export const ExploreAgentPrompt: React.FC = () => {
  const {
    services: { application },
  } = useKibana();
  const euiThemeContext = useEuiTheme();
  const { data: agents = [] } = useAgents();
  const [chatInput, setChatInput] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>();
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | undefined>();

  // Set default agent when agents are loaded
  useEffect(() => {
    if (agents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId]);

  const inputContainerStyles = getInputContainerStyles(euiThemeContext);

  const handleSubmit = () => {
    if (chatInput.trim() === '') {
      return;
    }

    // Navigate to Agent Builder with the message, agent ID, and connector ID in location state
    application.navigateToApp(AGENT_BUILDER_APP_ID, {
      path: AGENT_BUILDER_CONVERSATIONS_NEW_PATH,
      state: {
        initialMessage: chatInput.trim(),
        agentId: selectedAgentId,
        connectorId: selectedConnectorId,
      },
    });
  };

  return (
    <EuiFlexGroup
      responsive={false}
      alignItems="flexStart"
      direction="column"
      gutterSize="l"
      data-test-subj="workplaceAIExploreAgentPrompt"
    >
      <EuiFlexItem grow={false} css={titleContainerStyles}>
        <EuiTitle size="m" css={titleStyles}>
          <h2>
            {i18n.translate('xpack.workplaceai.exploreAgentPrompt.title', {
              defaultMessage: 'How can I help you?',
            })}
          </h2>
        </EuiTitle>
      </EuiFlexItem>

      <EuiFlexItem grow={false} css={fullWidthStyles}>
        <EuiFlexGroup
          css={inputContainerStyles}
          direction="column"
          gutterSize="s"
          responsive={false}
          alignItems="stretch"
          justifyContent="center"
          data-test-subj="workplaceAIExploreAgentInputForm"
        >
          <EuiFlexItem>
            <EuiTextArea
              placeholder={i18n.translate('xpack.workplaceai.exploreAgentPrompt.inputPlaceholder', {
                defaultMessage: 'Ask anything',
              })}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              rows={3}
              fullWidth
              css={textAreaStyles}
              data-test-subj="workplaceAIExploreAgentInput"
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              gutterSize="s"
              responsive={false}
              alignItems="center"
              justifyContent="spaceBetween"
            >
              <EuiFlexItem grow={false}>
                <ConnectorSelector
                  selectedConnectorId={selectedConnectorId}
                  onSelectConnector={setSelectedConnectorId}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
                  <EuiFlexItem grow={false}>
                    <AgentSelector
                      selectedAgentId={selectedAgentId}
                      onAgentChange={setSelectedAgentId}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      iconType="arrowUp"
                      aria-label={i18n.translate(
                        'xpack.workplaceai.exploreAgentPrompt.submitAriaLabel',
                        {
                          defaultMessage: 'Submit',
                        }
                      )}
                      color="primary"
                      display="fill"
                      size="m"
                      disabled={chatInput.trim() === ''}
                      onClick={handleSubmit}
                      data-test-subj="workplaceAIExploreAgentSubmit"
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
