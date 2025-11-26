/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiTitle,
  EuiLoadingSpinner,
  EuiEmptyPrompt,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiSpacer,
  EuiLink,
  EuiButtonIcon,
  useGeneratedHtmlId,
  EuiButton,
  EuiCallOut,
} from '@elastic/eui';
import styled from '@emotion/styled';
import { useQueryClient } from '@kbn/react-query';
import {
  useAssistantContext,
  useLoadConnectors,
  ConnectorSelectorInline,
} from '@kbn/elastic-assistant';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import type { ActionConnectorProps } from '@kbn/triggers-actions-ui-plugin/public/types';
import {
  useThreatHuntingPriorities,
  THREAT_HUNTING_PRIORITIES_QUERY_KEY,
} from './hooks/use_threat_hunting_priorities';
import type { ThreatHuntingPriority } from '../../api/threat_hunting_priorities';
import { useGenerateThreatHuntingPriorities } from '../../api/threat_hunting_priorities';
import { useAskAiAssistant } from '../entity_details_flyout/tabs/risk_inputs/use_ask_ai_assistant';
import { getGenAiConfig } from '../../../attack_discovery/pages/use_attack_discovery/helpers';
import * as i18n from './translations';

interface PriorityFlyoutProps {
  priority: ThreatHuntingPriority | null;
  onClose: () => void;
}

interface ChatRecommendationItemProps {
  recommendation: string;
  priority: ThreatHuntingPriority;
  asListItem?: boolean;
}

interface RotatingChatRecommendationsProps {
  recommendations: string[];
  priority: ThreatHuntingPriority;
}

interface PriorityFeedbackButtonsProps {
  priorityId: string;
  onThumbsUp?: () => void;
  onThumbsDown?: () => void;
}

const PriorityFeedbackButtons = ({
  priorityId,
  onThumbsUp,
  onThumbsDown,
}: PriorityFeedbackButtonsProps) => {
  const handleThumbsUp = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onThumbsUp?.();
    },
    [onThumbsUp]
  );

  const handleThumbsDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onThumbsDown?.();
    },
    [onThumbsDown]
  );

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="thumbUp"
          aria-label="Thumbs up"
          onClick={handleThumbsUp}
          data-test-subj={`priority-thumbs-up-${priorityId}`}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="thumbDown"
          aria-label="Thumbs down"
          onClick={handleThumbsDown}
          data-test-subj={`priority-thumbs-down-${priorityId}`}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const FadeContainer = styled.div`
  position: relative;
  min-height: 40px;
  overflow: hidden;
`;

const FadeItem = styled.div<{ isVisible: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  opacity: ${({ isVisible }) => (isVisible ? 1 : 0)};
  transition: opacity 0.8s ease-in-out;
  pointer-events: ${({ isVisible }) => (isVisible ? 'auto' : 'none')};
`;

const RotatingChatRecommendations = ({
  recommendations,
  priority,
}: RotatingChatRecommendationsProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (recommendations.length <= 1) {
      return;
    }

    intervalRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % recommendations.length);
    }, 10000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [recommendations.length]);

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <FadeContainer>
      {recommendations.map((recommendation, index) => (
        <FadeItem key={index} isVisible={index === currentIndex}>
          <ChatRecommendationItem recommendation={recommendation} priority={priority} />
        </FadeItem>
      ))}
    </FadeContainer>
  );
};

const ChatRecommendationItem = ({
  recommendation,
  priority,
  asListItem = false,
}: ChatRecommendationItemProps) => {
  const { _source } = priority;

  const getPromptContext = useCallback(async () => {
    const contextParts = [`### Threat Hunting Priority: ${_source.title || 'Untitled Priority'}`];

    if (_source.byline) {
      contextParts.push(`Byline: ${_source.byline}`);
    }

    if (_source.description) {
      contextParts.push(`Description: ${_source.description}`);
    }

    if (_source.entities && _source.entities.length > 0) {
      const entitiesList = _source.entities
        .map((e) => `${e.type}: ${e.idField} = ${e.idValue}`)
        .join(', ');
      contextParts.push(`Entities: ${entitiesList}`);
    }

    if (_source.tags && _source.tags.length > 0) {
      contextParts.push(`Tags: ${_source.tags.join(', ')}`);
    }

    return contextParts.join('\n');
  }, [_source]);

  const { showAssistantOverlay, disabled } = useAskAiAssistant({
    title: `Threat Hunting Priority: ${_source.title || 'Untitled Priority'}`,
    description: _source.byline || '',
    suggestedPrompt: recommendation,
    getPromptContext,
  });

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation(); // Prevent card click when clicking recommendation
      if (!disabled) {
        showAssistantOverlay();
      }
    },
    [disabled, showAssistantOverlay]
  );

  const testSubj = `chat-recommendation-${recommendation
    .slice(0, 20)
    .replace(/[^a-zA-Z0-9]/g, '-')}`;

  const content = disabled ? (
    <EuiText size="xs" color="subdued">
      {recommendation}
    </EuiText>
  ) : (
    <EuiText size="xs" color="subdued">
      <EuiLink onClick={handleClick} data-test-subj={testSubj}>
        {recommendation}
      </EuiLink>
    </EuiText>
  );

  if (asListItem) {
    return <li>{content}</li>;
  }

  return content;
};

const PriorityFlyout = ({ priority, onClose }: PriorityFlyoutProps) => {
  const flyoutTitleId = useGeneratedHtmlId({
    prefix: 'ThreatHuntingPriority',
  });

  if (!priority) {
    return null;
  }

  const { _source } = priority;

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      aria-labelledby={flyoutTitleId}
      size="m"
      data-test-subj="threat-hunting-priority-flyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2 id={flyoutTitleId}>{_source.title || i18n.UNTITLED_PRIORITY}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <PriorityFeedbackButtons
              priorityId={priority._id}
              onThumbsUp={() => {
                // TODO: Implement thumbs up feedback
              }}
              onThumbsDown={() => {
                // TODO: Implement thumbs down feedback
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {_source.byline && (
          <>
            <EuiText>
              <p>
                <strong>{i18n.BYLINE_LABEL}</strong>
                {': '}
                {_source.byline}
              </p>
            </EuiText>
            <EuiSpacer size="m" />
          </>
        )}

        {_source.description && (
          <>
            <EuiText>
              <p>
                <strong>{i18n.DESCRIPTION_LABEL}</strong>
                {':'}
              </p>
              <p>{_source.description}</p>
            </EuiText>
            <EuiSpacer size="m" />
          </>
        )}

        {_source.priority && (
          <>
            <EuiText>
              <p>
                <strong>{i18n.PRIORITY_LABEL}</strong>
                {': '}
                {_source.priority}
                {'/10'}
              </p>
            </EuiText>
            <EuiSpacer size="m" />
          </>
        )}

        {_source.entities && _source.entities.length > 0 && (
          <>
            <EuiText>
              <p>
                <strong>{i18n.ENTITIES_LABEL}</strong>
                {':'}
              </p>
              <ul>
                {_source.entities.map((entity, index) => (
                  <li key={index}>
                    {entity.type}
                    {': '}
                    {entity.idField}
                    {' = '}
                    {entity.idValue}
                  </li>
                ))}
              </ul>
            </EuiText>
            <EuiSpacer size="m" />
          </>
        )}

        {_source.tags && _source.tags.length > 0 && (
          <>
            <EuiText>
              <p>
                <strong>{i18n.TAGS_LABEL}</strong>
                {': '}
                {_source.tags.join(', ')}
              </p>
            </EuiText>
            <EuiSpacer size="m" />
          </>
        )}

        {(() => {
          // Handle both camelCase and snake_case field names from API
          const chatRecommendations = _source.chatRecommendations || _source.chat_recommendations;

          return chatRecommendations && chatRecommendations.length > 0 ? (
            <>
              <EuiText>
                <p>
                  <strong>{i18n.CHAT_RECOMMENDATIONS_LABEL}</strong>
                  {':'}
                </p>
                <ul>
                  {chatRecommendations.map((recommendation, index) => (
                    <ChatRecommendationItem
                      key={index}
                      recommendation={recommendation}
                      priority={priority}
                      asListItem
                    />
                  ))}
                </ul>
              </EuiText>
            </>
          ) : null;
        })()}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

export const ThreatHuntingPriorities = () => {
  const { data, isLoading, isError } = useThreatHuntingPriorities({
    limit: 20,
    sort_order: 'desc',
  });
  const [selectedPriority, setSelectedPriority] = useState<ThreatHuntingPriority | null>(null);
  const queryClient = useQueryClient();
  const { http, settings } = useAssistantContext();
  const { data: aiConnectors } = useLoadConnectors({
    http,
    settings,
  });
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | undefined>();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const { generateThreatHuntingPriorities } = useGenerateThreatHuntingPriorities();

  // Set default connector if only one is available
  useEffect(() => {
    if (aiConnectors != null && aiConnectors.length === 1) {
      setSelectedConnectorId(aiConnectors[0].id);
    } else if (aiConnectors != null && aiConnectors.length === 0) {
      setSelectedConnectorId(undefined);
    }
  }, [aiConnectors]);

  const handlePriorityClick = (priority: ThreatHuntingPriority) => {
    setSelectedPriority(priority);
  };

  const handleCloseFlyout = () => {
    setSelectedPriority(null);
  };

  const handleGenerateMore = useCallback(async () => {
    if (!selectedConnectorId) {
      setGenerateError('Please select an AI connector');
      return;
    }

    const selectedConnector = aiConnectors?.find((c) => c.id === selectedConnectorId);
    if (!selectedConnector) {
      setGenerateError('Selected connector not found');
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);

    try {
      const genAiConfig = getGenAiConfig(selectedConnector as ActionConnector);
      const model =
        genAiConfig?.defaultModel ||
        (selectedConnector as ActionConnectorProps<{ defaultModel?: string }, unknown>)?.config
          ?.defaultModel ||
        '';

      await generateThreatHuntingPriorities({
        signal: undefined,
        params: {
          apiConfig: {
            actionTypeId: selectedConnector.actionTypeId,
            connectorId: selectedConnector.id,
            model,
          },
        },
      });

      // Invalidate and refetch priorities after successful generation
      await queryClient.invalidateQueries({
        queryKey: [THREAT_HUNTING_PRIORITIES_QUERY_KEY],
      });
    } catch (error) {
      setGenerateError(error instanceof Error ? error.message : 'Failed to generate priorities');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedConnectorId, aiConnectors, generateThreatHuntingPriorities, queryClient]);

  if (isLoading) {
    return (
      <EuiPanel hasBorder paddingSize="l">
        <EuiFlexGroup justifyContent="center" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

  if (isError || !data?.data || data.data.length === 0) {
    return (
      <EuiPanel hasBorder paddingSize="l">
        <EuiEmptyPrompt
          iconType="document"
          title={<h3>{i18n.NO_PRIORITIES_TITLE}</h3>}
          body={<p>{i18n.NO_PRIORITIES_DESCRIPTION}</p>}
        />
      </EuiPanel>
    );
  }

  const priorities = data.data;

  return (
    <>
      <EuiPanel hasBorder paddingSize="l">
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiTitle size="s">
                  <h2>{i18n.THREAT_HUNTING_PRIORITIES_TITLE}</h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <ConnectorSelectorInline
                      onConnectorIdSelected={setSelectedConnectorId}
                      selectedConnectorId={selectedConnectorId}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      iconType="sparkles"
                      onClick={handleGenerateMore}
                      isLoading={isGenerating}
                      isDisabled={!selectedConnectorId || isGenerating}
                      data-test-subj="generate-more-priorities-button"
                    >
                      {i18n.GENERATE_MORE_BUTTON}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {generateError && (
            <EuiFlexItem grow={false}>
              <EuiCallOut
                title={i18n.GENERATE_ERROR_TITLE}
                color="danger"
                iconType="error"
                size="s"
                announceOnMount
              >
                <p>{generateError}</p>
              </EuiCallOut>
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <div style={{ overflowX: 'auto' }}>
              <EuiFlexGroup direction="row" gutterSize="m" wrap={false}>
                {priorities.map((priority) => (
                  <EuiFlexItem
                    key={priority._id}
                    grow={false}
                    style={{ minWidth: '300px', maxWidth: '400px' }}
                  >
                    <EuiPanel
                      paddingSize="m"
                      hasShadow={false}
                      onClick={() => handlePriorityClick(priority)}
                      style={{ cursor: 'pointer' }}
                      data-test-subj={`threat-hunting-priority-card-${priority._id}`}
                    >
                      <EuiFlexGroup direction="column" gutterSize="s">
                        <EuiFlexItem grow={false}>
                          <EuiFlexGroup
                            justifyContent="spaceBetween"
                            alignItems="center"
                            gutterSize="s"
                          >
                            <EuiFlexItem>
                              <EuiTitle size="xs">
                                <h3>{priority._source.title || i18n.UNTITLED_PRIORITY}</h3>
                              </EuiTitle>
                            </EuiFlexItem>
                            <EuiFlexItem grow={false}>
                              <PriorityFeedbackButtons
                                priorityId={priority._id}
                                onThumbsUp={() => {
                                  // TODO: Implement thumbs up feedback
                                }}
                                onThumbsDown={() => {
                                  // TODO: Implement thumbs down feedback
                                }}
                              />
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        </EuiFlexItem>
                        {priority._source.byline && (
                          <EuiFlexItem>
                            <EuiText size="s" color="subdued">
                              <p>{priority._source.byline}</p>
                            </EuiText>
                          </EuiFlexItem>
                        )}
                        {(() => {
                          const chatRecommendations =
                            priority._source.chatRecommendations ||
                            priority._source.chat_recommendations;
                          return chatRecommendations && chatRecommendations.length > 0 ? (
                            <EuiFlexItem grow={false}>
                              <EuiSpacer size="s" />
                              <RotatingChatRecommendations
                                recommendations={chatRecommendations}
                                priority={priority}
                              />
                            </EuiFlexItem>
                          ) : null;
                        })()}
                      </EuiFlexGroup>
                    </EuiPanel>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      {selectedPriority && (
        <PriorityFlyout priority={selectedPriority} onClose={handleCloseFlyout} />
      )}
    </>
  );
};
