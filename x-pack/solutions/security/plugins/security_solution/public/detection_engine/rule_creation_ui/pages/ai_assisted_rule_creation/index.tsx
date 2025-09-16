/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiAccordion,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiFlexGroup,
  EuiResizableContainer,
  EuiFlexItem,
  useEuiTheme,
} from '@elastic/eui';
import React, { memo, useCallback, useRef, useState, useMemo, useEffect } from 'react';
// import styled from 'styled-components';
import { css } from '@emotion/react';
import { ruleTypeMappings } from '@kbn/securitysolution-rules';
import { ChatActions } from '@kbn/elastic-assistant/impl/assistant/chat_actions';
import { ConnectorSelector } from '@kbn/security-solution-connectors';

import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import {
  isMlRule,
  isThreatMatchRule,
  isEsqlRule,
} from '../../../../../common/detection_engine/utils';
import { useCreateRule } from '../../../rule_management/logic';
import type { RuleCreateProps } from '../../../../../common/api/detection_engine/model/rule_schema';
import { useListsConfig } from '../../../../detections/containers/detection_engine/lists/use_lists_config';
import { hasUserCRUDPermission } from '../../../../common/utils/privileges';

import {
  getDetectionEngineUrl,
  getRuleDetailsUrl,
  getRulesUrl,
} from '../../../../common/components/link_to/redirect_to_detection_engine';
import { SecuritySolutionPageWrapper } from '../../../../common/components/page_wrapper';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';
import { useUserData } from '../../../../detections/components/user_info';
import { AccordionTitle } from '../../components/accordion_title';
import { StepDefineRule, StepDefineRuleReadOnly } from '../../components/step_define_rule';
import { useExperimentalFeatureFieldsTransform } from '../../components/step_define_rule/use_experimental_feature_fields_transform';
import { StepAboutRule, StepAboutRuleReadOnly } from '../../components/step_about_rule';
import { StepScheduleRule, StepScheduleRuleReadOnly } from '../../components/step_schedule_rule';
import {
  stepActionsDefaultValue,
  StepRuleActions,
  StepRuleActionsReadOnly,
} from '../../../rule_creation/components/step_rule_actions';
import * as RuleI18n from '../../../common/translations';
import {
  redirectToDetections,
  getActionMessageParams,
  MaxWidthEuiFlexItem,
} from '../../../common/helpers';
import type { DefineStepRule } from '../../../common/types';
import { RuleStep } from '../../../common/types';
import { ALERT_SUPPRESSION_FIELDS_FIELD_NAME } from '../../../rule_creation/components/alert_suppression_edit';
import { useConfirmValidationErrorsModal } from '../../../../common/hooks/use_confirm_validation_errors_modal';
import { formatRule } from '../rule_creation/helpers';
import { useEsqlIndex, useEsqlQueryForAboutStep } from '../../hooks';
import * as i18n from '../rule_creation/translations';
import { SecurityPageName } from '../../../../app/types';
import {
  defaultSchedule,
  defaultThreatMatchSchedule,
  ruleStepsOrder,
  stepAboutDefaultValue,
  stepDefineDefaultValue,
} from '../../../common/utils';
import {
  APP_UI_ID,
  DEFAULT_INDEX_KEY,
  DEFAULT_INDICATOR_SOURCE_PATH,
  DEFAULT_THREAT_INDEX_KEY,
} from '../../../../../common/constants';
import { useKibana, useUiSetting$ } from '../../../../common/lib/kibana';
import { RulePreview } from '../../components/rule_preview';
import { useStartMlJobs } from '../../../rule_management/logic/use_start_ml_jobs';
import { VALIDATION_WARNING_CODE_FIELD_NAME_MAP } from '../../../rule_creation/constants/validation_warning_codes';
import { extractValidationMessages } from '../../../rule_creation/logic/extract_validation_messages';
import { NextStep } from '../../components/next_step';
import { useRuleForms, useRuleIndexPattern } from '../form';
import { CustomHeaderPageMemo } from '..';
import { useAIConnectors } from '../../../../common/hooks/use_ai_connectors';
import { PromptTextArea } from './prompt_textarea';
import { useAiRuleCreation } from './hooks/use_ai_rule_creation';
import { CreateRulePage } from './rule_create_form';

const AiAssistedCreateRulePageComponent: React.FC = () => {
  const [
    {
      loading: userInfoLoading,
      isSignalIndexExists,
      isAuthenticated,
      hasEncryptionKey,
      canUserCRUD,
    },
  ] = useUserData();
  const { loading: listsConfigLoading, needsConfiguration: needsListsConfiguration } =
    useListsConfig();
  const { addSuccess, addError } = useAppToasts();
  const { navigateToApp } = useKibana().services.application;
  const { application, triggersActionsUi } = useKibana().services;
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
                            description: c?.config?.apiProvider,
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
                />
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

const MemoEuiAccordion = memo(EuiAccordion);
