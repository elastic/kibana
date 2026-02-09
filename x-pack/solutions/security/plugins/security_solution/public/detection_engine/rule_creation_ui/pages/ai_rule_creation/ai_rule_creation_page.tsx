/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiSpacer,
  EuiText,
  EuiFlexGroup,
  EuiResizableContainer,
  EuiFlexItem,
  EuiProgress,
  EuiCallOut,
  EuiButton,
  EuiButtonIcon,
  EuiToolTip,
} from '@elastic/eui';
import { ConnectorSelector } from '@kbn/security-solution-connectors';
import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';

import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useListsConfig } from '../../../../detections/containers/detection_engine/lists/use_lists_config';
import { SecuritySolutionPageWrapper } from '../../../../common/components/page_wrapper';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';
import { useUserData } from '../../../../detections/components/user_info';
import { MaxWidthEuiFlexItem, redirectToDetections } from '../../../common/helpers';
import { SecurityPageName } from '../../../../app/types';
import { useAgentBuilderStream } from './hooks/use_agent_builder_stream';
import { useInferenceConnectors } from './hooks/use_inference_connectors';
import { CreateRulePage } from '../rule_creation';
import { useKibana } from '../../../../common/lib/kibana';
import { PromptComponent } from './prompt';
import { LinkIcon } from '../../../../common/components/link_icon';
import { useHeaderLinkBackStyles } from '../../../../common/components/header_page';
import { AiRuleCreationUpdates } from './agent_builder_updates';
import { APP_UI_ID } from '../../../../../common/constants';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { AiRuleInfo } from './ai_rule_creation_info';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import {
  getDetectionEngineUrl,
  getRulesUrl,
} from '../../../../common/components/link_to/redirect_to_detection_engine';
import { useAgentBuilderAvailability } from '../../../../agent_builder/hooks/use_agent_builder_availability';

import * as i18n from './translations';

const manageConnectorsPath = '/insightsAndAlerting/triggersActionsConnectors/connectors';

const AiRuleCreationPageComponent: React.FC = () => {
  const [{ loading: userInfoLoading, isSignalIndexExists, isAuthenticated, hasEncryptionKey }] =
    useUserData();
  const canEditRules = useUserPrivileges().rulesPrivileges.rules.edit;

  const aiRuleCreationEnabled = useIsExperimentalFeatureEnabled('aiRuleCreationEnabled');
  const { isAgentBuilderEnabled } = useAgentBuilderAvailability();

  const { loading: listsConfigLoading, needsConfiguration: needsListsConfiguration } =
    useListsConfig();
  const { addError } = useAppToasts();
  const isLoading = userInfoLoading || listsConfigLoading;
  const collapseFn = useRef<() => void | undefined>();
  const lastSubmittedPrompt = useRef<string>('');
  const {
    settings,
    application: { navigateToApp, getUrlForApp },
  } = useKibana().services;
  const styles = useHeaderLinkBackStyles();

  const manageConnectorsUrl = useMemo(
    () => getUrlForApp('management', { path: manageConnectorsPath }),
    [getUrlForApp]
  );

  const [promptValue, setPromptValue] = useState('');
  const [submittedPromptValue, setSubmittedPromptValue] = useState('');
  const [showForm, setShowForm] = useState(false);
  const { aiConnectors, isLoading: isAiConnectorsLoading } = useInferenceConnectors();

  const [selectedConnectorId, setSelectedConnectorId] = useState<string | undefined>();

  useEffect(() => {
    if (!isAiConnectorsLoading && selectedConnectorId === undefined) {
      setSelectedConnectorId(aiConnectors[0]?.id);
    }
  }, [aiConnectors, isAiConnectorsLoading, selectedConnectorId]);

  const {
    rule,
    streamRuleCreation,
    updates,
    cancelRuleCreation,
    isStreaming: isAiRuleCreationInProgress,
    isCancelled: isAiRuleCreationCancelled,
  } = useAgentBuilderStream();

  const isValid = promptValue.length > 0 && selectedConnectorId != null;
  const submitPrompt = useCallback(() => {
    if (isValid) {
      setSubmittedPromptValue(promptValue);
      streamRuleCreation({
        message: promptValue,
        connectorId: selectedConnectorId,
      })
        .then(() => {
          setShowForm(true);
        })
        .catch((err) => {
          addError(err, { title: i18n.AI_RULE_CREATION_FAILURE_TITLE });
        });
    }
  }, [promptValue, isValid, streamRuleCreation, selectedConnectorId, addError]);

  const handlePromptSubmit = useCallback(() => {
    // Prevent submitting the same prompt again
    if (lastSubmittedPrompt.current === promptValue) {
      setShowForm(true);
      return;
    }
    submitPrompt();
  }, [promptValue, submitPrompt]);

  const handleRegenerate = useCallback(() => {
    submitPrompt();
  }, [submitPrompt]);

  const onSendMessage = useCallback(() => {
    handlePromptSubmit();
  }, [handlePromptSubmit]);

  const backComponent = useMemo(
    () => (
      <div css={styles.linkBack}>
        <LinkIcon
          dataTestSubj="link-back-to-ai-prompt"
          onClick={(ev: Event) => {
            ev.preventDefault();
            setShowForm(false);
            setPromptValue(submittedPromptValue);
            lastSubmittedPrompt.current = submittedPromptValue;
          }}
          iconType="arrowLeft"
        >
          {i18n.AI_RULE_CREATION_BACK_TO_PROMPT}
        </LinkIcon>
      </div>
    ),
    [styles.linkBack, submittedPromptValue]
  );

  const isAiRuleCreationAvailable = aiRuleCreationEnabled && isAgentBuilderEnabled;

  const needsRedirectToDetections = useMemo(() => {
    return redirectToDetections(
      isSignalIndexExists,
      isAuthenticated,
      hasEncryptionKey,
      needsListsConfiguration
    );
  }, [isSignalIndexExists, isAuthenticated, hasEncryptionKey, needsListsConfiguration]);

  const canUserAccessAiRuleCreation = useMemo(() => {
    return canEditRules && isAiRuleCreationAvailable;
  }, [canEditRules, isAiRuleCreationAvailable]);

  useEffect(() => {
    if (needsRedirectToDetections) {
      navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.alerts,
        path: getDetectionEngineUrl(),
      });
    } else if (!canUserAccessAiRuleCreation) {
      navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.rules,
        path: getRulesUrl(),
      });
    }
  }, [needsRedirectToDetections, navigateToApp, canUserAccessAiRuleCreation]);

  return showForm && rule ? (
    <CreateRulePage rule={rule} backComponent={backComponent} sendToAgentChat />
  ) : (
    <>
      <SecuritySolutionPageWrapper>
        <EuiResizableContainer>
          {(EuiResizablePanel, EuiResizableButton, { togglePanel }) => {
            collapseFn.current = () => togglePanel?.('preview', { direction: 'left' });
            return (
              <>
                <EuiResizablePanel initialSize={70} minSize={'40%'} mode="main">
                  <EuiFlexGroup direction="row" justifyContent="spaceAround">
                    <MaxWidthEuiFlexItem>
                      <EuiText>
                        <h3>{i18n.AI_RULE_CREATION_DESCRIBE_RULE_HEADING}</h3>
                      </EuiText>
                      <EuiSpacer size="m" />
                      <AiRuleInfo />
                      <EuiSpacer size="m" />
                      <EuiFlexItem grow={false}>
                        <EuiFlexGroup gutterSize="s" alignItems="center">
                          <EuiFlexItem grow={false}>
                            <ConnectorSelector
                              isLoading={isAiConnectorsLoading}
                              connectors={aiConnectors}
                              selectedId={selectedConnectorId}
                              onChange={setSelectedConnectorId}
                              mode={'combobox'}
                              settings={settings}
                            />
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <EuiToolTip
                              content={i18n.AI_RULE_CREATION_MANAGE_CONNECTORS}
                              disableScreenReaderOutput
                            >
                              <EuiButtonIcon
                                iconType="gear"
                                href={manageConnectorsUrl}
                                target="_blank"
                                aria-label={i18n.AI_RULE_CREATION_MANAGE_CONNECTORS}
                                data-test-subj="ai-rule-creation-manage-connectors-button"
                              />
                            </EuiToolTip>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiFlexItem>
                      <EuiSpacer size="m" />
                      <PromptComponent
                        handlePromptSubmit={handlePromptSubmit}
                        setPromptValue={setPromptValue}
                        promptValue={promptValue}
                        isLoading={isLoading}
                        isValid={isValid}
                        onSendMessage={onSendMessage}
                        isAiRuleCreationInProgress={isAiRuleCreationInProgress}
                        isDisabled={aiConnectors.length === 0}
                      />
                      {rule || isAiRuleCreationCancelled ? (
                        <>
                          <EuiSpacer size="m" />
                          <EuiFlexGroup direction="row" justifyContent="flexStart" gutterSize="s">
                            <EuiFlexItem grow={false}>
                              <EuiButton
                                onClick={handleRegenerate}
                                isLoading={isAiRuleCreationInProgress}
                                isDisabled={!isValid}
                                data-test-subj="ai-rule-creation-regenerate-button"
                              >
                                {i18n.AI_RULE_CREATION_REGENERATE_BUTTON}
                              </EuiButton>
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        </>
                      ) : null}
                      {isAiRuleCreationInProgress ? (
                        <>
                          <EuiSpacer size="m" />
                          <EuiFlexGroup direction="row" justifyContent="flexStart" gutterSize="s">
                            <EuiFlexItem grow={false}>
                              <EuiButton
                                color="danger"
                                onClick={cancelRuleCreation}
                                data-test-subj="ai-rule-creation-cancel-button"
                              >
                                {i18n.AI_RULE_CREATION_CANCEL_BUTTON}
                              </EuiButton>
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        </>
                      ) : null}
                    </MaxWidthEuiFlexItem>
                  </EuiFlexGroup>
                  <EuiSpacer size="m" />
                  <EuiFlexGroup direction="row" justifyContent="spaceAround">
                    <MaxWidthEuiFlexItem>
                      {isAiRuleCreationInProgress && (
                        <EuiFlexItem>
                          <EuiProgress
                            size="s"
                            color="primary"
                            data-test-subj="ai-rule-creation-progress"
                          />
                        </EuiFlexItem>
                      )}

                      {isAiRuleCreationCancelled ? (
                        <EuiCallOut
                          announceOnMount
                          color="warning"
                          iconType="warning"
                          data-test-subj="ai-rule-creation-cancelled-callout"
                        >
                          <EuiText size="s">{i18n.AI_RULE_CREATION_CANCELLED_MESSAGE}</EuiText>
                        </EuiCallOut>
                      ) : null}

                      <EuiSpacer size="m" />
                      <AiRuleCreationUpdates updates={updates} />
                    </MaxWidthEuiFlexItem>
                  </EuiFlexGroup>
                </EuiResizablePanel>

                <EuiResizablePanel
                  id={'preview'}
                  mode="collapsible"
                  initialSize={30}
                  minSize={'20%'}
                >
                  <></>
                </EuiResizablePanel>
              </>
            );
          }}
        </EuiResizableContainer>
      </SecuritySolutionPageWrapper>

      <SpyRoute pageName={SecurityPageName.aiRuleCreation} />
    </>
  );
};

export const AiRuleCreationPage = React.memo(AiRuleCreationPageComponent);
