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
} from '@elastic/eui';
import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { ConnectorSelector } from '@kbn/security-solution-connectors';

import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useListsConfig } from '../../../../detections/containers/detection_engine/lists/use_lists_config';
import { SecuritySolutionPageWrapper } from '../../../../common/components/page_wrapper';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';
import { useUserData } from '../../../../detections/components/user_info';
import { MaxWidthEuiFlexItem, redirectToDetections } from '../../../common/helpers';
import { SecurityPageName } from '../../../../app/types';
import { useAIConnectors } from '../../../../common/hooks/use_ai_connectors';
import { useAgentBuilderStream } from './hooks/use_agent_builder_stream';
import { CreateRulePage } from '../rule_creation';
import { useKibana } from '../../../../common/lib/kibana';
import { PromptComponent } from './prompt';
import { LinkIcon } from '../../../../common/components/link_icon';
import { useHeaderLinkBackStyles } from '../../../../common/components/header_page';
import { AiAssistedRuleUpdates } from './agent_builder_updates';
import { APP_UI_ID } from '../../../../../common/constants';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { AiAssistedRuleInfo } from './ai_assisted_rule_info';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import {
  getDetectionEngineUrl,
  getRulesUrl,
} from '../../../../common/components/link_to/redirect_to_detection_engine';
import { useAgentBuilderAvailability } from '../../../../agent_builder/hooks/use_agent_builder_availability';

import * as i18n from './translations';

const AiAssistedCreateRulePageComponent: React.FC = () => {
  const [{ loading: userInfoLoading, isSignalIndexExists, isAuthenticated, hasEncryptionKey }] =
    useUserData();
  const canEditRules = useUserPrivileges().rulesPrivileges.edit;

  const aiAssistedRuleCreationEnabled = useIsExperimentalFeatureEnabled(
    'aiAssistedRuleCreationEnabled'
  );
  const { isAgentBuilderEnabled } = useAgentBuilderAvailability();

  const { loading: listsConfigLoading, needsConfiguration: needsListsConfiguration } =
    useListsConfig();
  const { addError } = useAppToasts();
  const isLoading = userInfoLoading || listsConfigLoading;
  const collapseFn = useRef<() => void | undefined>();
  const lastSubmittedPrompt = useRef<string>('');
  const {
    settings,
    application: { navigateToApp },
  } = useKibana().services;
  const styles = useHeaderLinkBackStyles();

  const [promptValue, setPromptValue] = useState('');
  const [submittedPromptValue, setSubmittedPromptValue] = useState('');
  const [showForm, setShowForm] = useState(false);
  const { aiConnectors, isLoading: isAiConnectorsLoading } = useAIConnectors();

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
          addError(err, { title: i18n.AI_ASSISTED_RULE_CREATION_FAILURE_TITLE });
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
          {i18n.AI_ASSISTED_RULE_CREATION_BACK_TO_PROMPT}
        </LinkIcon>
      </div>
    ),
    [styles.linkBack, submittedPromptValue]
  );

  if (
    redirectToDetections(
      isSignalIndexExists,
      isAuthenticated,
      hasEncryptionKey,
      needsListsConfiguration
    )
  ) {
    navigateToApp(APP_UI_ID, {
      deepLinkId: SecurityPageName.alerts,
      path: getDetectionEngineUrl(),
    });
    return null;
  } else if (!canEditRules || !isAgentBuilderEnabled || !aiAssistedRuleCreationEnabled) {
    navigateToApp(APP_UI_ID, {
      deepLinkId: SecurityPageName.rules,
      path: getRulesUrl(),
    });
    return null;
  }

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
                        <h3>{i18n.AI_ASSISTED_RULE_CREATION_DESCRIBE_RULE_HEADING}</h3>
                      </EuiText>
                      <EuiSpacer size="m" />
                      <AiAssistedRuleInfo />
                      <EuiSpacer size="m" />
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
                      <EuiSpacer size="m" />
                      <PromptComponent
                        handlePromptSubmit={handlePromptSubmit}
                        setPromptValue={setPromptValue}
                        promptValue={promptValue}
                        isLoading={isLoading}
                        isValid={isValid}
                        onSendMessage={onSendMessage}
                        isAiRuleCreationInProgress={isAiRuleCreationInProgress}
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
                              >
                                {i18n.AI_ASSISTED_RULE_CREATION_REGENERATE_BUTTON}
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
                              <EuiButton color="danger" onClick={cancelRuleCreation}>
                                {i18n.AI_ASSISTED_RULE_CREATION_CANCEL_BUTTON}
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
                          <EuiProgress size="s" color="primary" />
                        </EuiFlexItem>
                      )}

                      {isAiRuleCreationCancelled ? (
                        <EuiCallOut announceOnMount color="warning" iconType="warning">
                          <EuiText size="s">
                            {i18n.AI_ASSISTED_RULE_CREATION_CANCELLED_MESSAGE}
                          </EuiText>
                        </EuiCallOut>
                      ) : null}

                      <EuiSpacer size="m" />
                      <AiAssistedRuleUpdates updates={updates} />
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

      <SpyRoute pageName={SecurityPageName.aiAssistedRuleCreate} />
    </>
  );
};

export const AiAssistedCreateRulePage = React.memo(AiAssistedCreateRulePageComponent);
