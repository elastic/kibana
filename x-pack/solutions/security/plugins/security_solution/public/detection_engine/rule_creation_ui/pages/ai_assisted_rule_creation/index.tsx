/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiFlexGroup,
  EuiResizableContainer,
  EuiFlexItem,
  useEuiTheme,
} from '@elastic/eui';
import React, { useCallback, useRef, useState, useEffect } from 'react';
// import styled from 'styled-components';
import { css } from '@emotion/react';
import { ChatActions } from '@kbn/elastic-assistant/impl/assistant/chat_actions';
import { ConnectorSelector } from '@kbn/security-solution-connectors';

import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useListsConfig } from '../../../../detections/containers/detection_engine/lists/use_lists_config';

import { SecuritySolutionPageWrapper } from '../../../../common/components/page_wrapper';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';
import { useUserData } from '../../../../detections/components/user_info';
import { MaxWidthEuiFlexItem } from '../../../common/helpers';
import { SecurityPageName } from '../../../../app/types';
// import { useKibana } from '../../../../common/lib/kibana';
import { useAIConnectors } from '../../../../common/hooks/use_ai_connectors';
import { PromptTextArea } from './prompt_textarea';
import { useAiRuleCreation } from './hooks/use_ai_rule_creation';
import { CreateRulePage } from './rule_create_form';

const AiAssistedCreateRulePageComponent: React.FC = () => {
  const [
    {
      loading: userInfoLoading,
      // isSignalIndexExists,
      // isAuthenticated,
      // hasEncryptionKey,
      // canUserCRUD,
    },
  ] = useUserData();
  const { loading: listsConfigLoading } = useListsConfig();
  const { addError } = useAppToasts();
  // const { navigateToApp } = useKibana().services.application;
  const isLoading = userInfoLoading || listsConfigLoading;
  const { euiTheme } = useEuiTheme();
  const collapseFn = useRef<() => void | undefined>();

  const [promptValue, setPromptValue] = useState('');
  const { aiConnectors, isLoading: isAiConnectorsLoading } = useAIConnectors();

  const [selectedConnectorId, setSelectedConnectorId] = useState<string | undefined>();

  useEffect(() => {
    if (!isAiConnectorsLoading && selectedConnectorId === undefined) {
      setSelectedConnectorId(aiConnectors[0]?.id);
    }
  }, [aiConnectors, isAiConnectorsLoading, selectedConnectorId]);

  const {
    executeAiAssistedRuleCreation,
    rule,
    isLoading: isAiRuleCreationInProgress,
  } = useAiRuleCreation();
  const isValid = promptValue.length > 0 && selectedConnectorId != null;
  const handlePromptSubmit = useCallback(() => {
    if (isValid) {
      executeAiAssistedRuleCreation({
        message: promptValue,
        connectorId: selectedConnectorId,
      }).catch((err) => {
        addError(err, { title: 'Failure to suggest rule with AI assistant' });
      });
    }
  }, [executeAiAssistedRuleCreation, promptValue, selectedConnectorId, isValid, addError]);

  const onSendMessage = useCallback(() => {
    handlePromptSubmit();
    setPromptValue('');
  }, [handlePromptSubmit, setPromptValue]);

  const promptComponent = (
    <EuiFlexGroup
      gutterSize="none"
      alignItems={'flexEnd'}
      css={css`
        position: relative;
      `}
    >
      <EuiFlexItem
        css={css`
          width: 100%;
        `}
      >
        <PromptTextArea
          onPromptSubmit={handlePromptSubmit}
          setUserPrompt={setPromptValue}
          value={promptValue}
          isDisabled={isLoading}
        />
      </EuiFlexItem>
      <EuiFlexItem
        css={css`
          right: 0;
          position: absolute;
          margin-right: ${euiTheme.size.s};
          margin-bottom: ${euiTheme.size.s};
        `}
        grow={false}
      >
        <ChatActions
          isDisabled={isLoading && isValid}
          isLoading={isAiRuleCreationInProgress}
          onSendMessage={onSendMessage}
          promptValue={promptValue}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
  return rule ? (
    <CreateRulePage rule={rule} />
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
                        <h3>{'Describe the rule you want to create'}</h3>
                      </EuiText>
                      <EuiSpacer size="m" />
                      <EuiFlexItem grow={false}>
                        <ConnectorSelector
                          isLoading={isAiConnectorsLoading}
                          connectors={aiConnectors.map((c) => ({
                            name: c.name,
                            id: c.id,
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            description: (c as any).config?.apiProvider,
                          }))}
                          selectedId={selectedConnectorId}
                          onChange={setSelectedConnectorId}
                          mode={'combobox'}
                        />
                      </EuiFlexItem>
                      <EuiSpacer size="m" />

                      <EuiPanel hasBorder>{promptComponent}</EuiPanel>
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
