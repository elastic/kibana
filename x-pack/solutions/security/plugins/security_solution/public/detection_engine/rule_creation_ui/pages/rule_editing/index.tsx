/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTabbedContentTab } from '@elastic/eui';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiResizableContainer,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FC } from 'react';
import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import { useConfirmValidationErrorsModal } from '../../../../common/hooks/use_confirm_validation_errors_modal';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { isEsqlRule } from '../../../../../common/detection_engine/utils';
import { RulePreview } from '../../components/rule_preview';
import { getIsRulePreviewDisabled } from '../../components/rule_preview/helpers';
import type {
  RuleResponse,
  RuleUpdateProps,
} from '../../../../../common/api/detection_engine/model/rule_schema';
import { useRule, useUpdateRule } from '../../../rule_management/logic';
import { useListsConfig } from '../../../../detections/containers/detection_engine/lists/use_lists_config';
import { SecuritySolutionPageWrapper } from '../../../../common/components/page_wrapper';
import { hasUserCRUDPermission } from '../../../../common/utils/privileges';
import {
  getRuleDetailsUrl,
  getDetectionEngineUrl,
} from '../../../../common/components/link_to/redirect_to_detection_engine';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';
import { useUserData } from '../../../../detections/components/user_info';
import { StepPanel } from '../../../rule_creation/components/step_panel';
import { StepAboutRule } from '../../components/step_about_rule';
import { StepDefineRule } from '../../components/step_define_rule';
import { useExperimentalFeatureFieldsTransform } from '../../components/step_define_rule/use_experimental_feature_fields_transform';
import { StepScheduleRule } from '../../components/step_schedule_rule';
import { StepRuleActions } from '../../../rule_creation/components/step_rule_actions';
import { formatRule } from '../rule_creation/helpers';
import {
  getStepsData,
  redirectToDetections,
  getActionMessageParams,
  MaxWidthEuiFlexItem,
} from '../../../../detections/pages/detection_engine/rules/helpers';
import * as ruleI18n from '../../../../detections/pages/detection_engine/rules/translations';
import type { DefineStepRule } from '../../../../detections/pages/detection_engine/rules/types';
import { RuleStep } from '../../../../detections/pages/detection_engine/rules/types';
import * as i18n from './translations';
import { SecurityPageName } from '../../../../app/types';
import { ruleStepsOrder } from '../../../../detections/pages/detection_engine/rules/utils';
import { useKibana, useUiSetting$ } from '../../../../common/lib/kibana';
import { APP_UI_ID, DEFAULT_INDEX_KEY } from '../../../../../common/constants';
import { useStartTransaction } from '../../../../common/lib/apm/use_start_transaction';
import { SINGLE_RULE_ACTIONS } from '../../../../common/lib/apm/user_actions';
import { useGetSavedQuery } from '../../../../detections/pages/detection_engine/rules/use_get_saved_query';
import { extractValidationMessages } from '../../../rule_creation/logic/extract_validation_messages';
import { VALIDATION_WARNING_CODE_FIELD_NAME_MAP } from '../../../rule_creation/constants/validation_warning_codes';
import { useRuleForms, useRuleIndexPattern } from '../form';
import { useEsqlIndex, useEsqlQueryForAboutStep } from '../../hooks';
import { CustomHeaderPageMemo } from '..';
import { usePrebuiltRulesCustomizationStatus } from '../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_customization_status';
import { PrebuiltRulesCustomizationDisabledReason } from '../../../../../common/detection_engine/prebuilt_rules/prebuilt_rule_customization_status';
import { ALERT_SUPPRESSION_FIELDS_FIELD_NAME } from '../../../rule_creation/components/alert_suppression_edit';
import { usePrebuiltRuleCustomizationUpsellingMessage } from '../../../rule_management/logic/prebuilt_rules/use_prebuilt_rule_customization_upselling_message';

const EditRulePageComponent: FC<{ rule: RuleResponse }> = ({ rule }) => {
  const { addSuccess } = useAppToasts();
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
  const { application, triggersActionsUi } = useKibana().services;
  const { navigateToApp } = application;

  const { isRulesCustomizationEnabled, customizationDisabledReason } =
    usePrebuiltRulesCustomizationStatus();
  const canEditRule = isRulesCustomizationEnabled || !rule.immutable;

  const prebuiltCustomizationUpsellingMessage = usePrebuiltRuleCustomizationUpsellingMessage();

  const { detailName: ruleId } = useParams<{ detailName: string }>();

  const [activeStep, setActiveStep] = useState<RuleStep>(
    canEditRule ? RuleStep.defineRule : RuleStep.ruleActions
  );
  const { mutateAsync: updateRule, isLoading } = useUpdateRule();
  const [isRulePreviewVisible, setIsRulePreviewVisible] = useState(true);
  const collapseFn = useRef<() => void | undefined>();
  const [isQueryBarValid, setIsQueryBarValid] = useState(false);

  const backOptions = useMemo(
    () => ({
      path: getRuleDetailsUrl(ruleId ?? ''),
      text: `${i18n.BACK_TO} ${rule?.name ?? ''}`,
      pageId: SecurityPageName.rules,
      dataTestSubj: 'ruleEditBackToRuleDetails',
    }),
    [rule?.name, ruleId]
  );

  const [indicesConfig] = useUiSetting$<string[]>(DEFAULT_INDEX_KEY);

  const { aboutRuleData, defineRuleData, scheduleRuleData, ruleActionsData } = getStepsData({
    rule,
  });

  const {
    defineStepForm,
    defineStepData,
    aboutStepForm,
    aboutStepData,
    scheduleStepForm,
    scheduleStepData,
    actionsStepForm,
    actionsStepData,
  } = useRuleForms({
    defineStepDefault: defineRuleData,
    aboutStepDefault: aboutRuleData,
    scheduleStepDefault: scheduleRuleData,
    actionsStepDefault: ruleActionsData,
  });

  const { modal: confirmSavingWithWarningModal, confirmValidationErrors } =
    useConfirmValidationErrorsModal();

  const esqlQueryForAboutStep = useEsqlQueryForAboutStep({ defineStepData, activeStep });

  const esqlIndex = useEsqlIndex(defineStepData.queryBar.query.query, defineStepData.ruleType);

  const memoizedIndex = useMemo(
    () => (isEsqlRule(defineStepData.ruleType) ? esqlIndex : defineStepData.index),
    [defineStepData.index, esqlIndex, defineStepData.ruleType]
  );

  const defineStepFormFields = defineStepForm.getFields();
  const isPreviewDisabled = getIsRulePreviewDisabled({
    ruleType: defineStepData.ruleType,
    isQueryBarValid,
    isThreatQueryBarValid:
      defineStepFormFields.threatIndex?.isValid &&
      defineStepFormFields.threatQueryBar?.isValid &&
      defineStepFormFields.threatMapping?.isValid,
    index: memoizedIndex,
    dataViewId: defineStepData.dataViewId,
    dataSourceType: defineStepData.dataSourceType,
    threatIndex: defineStepData.threatIndex,
    threatMapping: defineStepData.threatMapping,
    machineLearningJobId: defineStepData.machineLearningJobId,
    queryBar: defineStepData.queryBar,
    newTermsFields: defineStepData.newTermsFields,
  });

  const loading = userInfoLoading || listsConfigLoading;
  const { isSavedQueryLoading, savedQuery } = useGetSavedQuery({
    savedQueryId: 'saved_id' in rule ? rule.saved_id : undefined,
    ruleType: rule?.type,
  });

  // Since in the edit step we start with an existing rule, we assume that
  // the steps are valid if isValid is undefined. Once the user triggers validation by
  // trying to submit the edits, the isValid statuses will be tracked and the callout appears
  // if some steps are invalid
  const stepIsValid = useCallback(
    (step: RuleStep): boolean => {
      switch (step) {
        case RuleStep.defineRule:
          return defineStepForm.isValid ?? true;
        case RuleStep.aboutRule:
          return aboutStepForm.isValid ?? true;
        case RuleStep.scheduleRule:
          return scheduleStepForm.isValid ?? true;
        case RuleStep.ruleActions:
          return actionsStepForm.isValid ?? true;
        default:
          return true;
      }
    },
    [
      aboutStepForm.isValid,
      actionsStepForm.isValid,
      defineStepForm.isValid,
      scheduleStepForm.isValid,
    ]
  );

  const invalidSteps = ruleStepsOrder.filter((step) => {
    return !stepIsValid(step);
  });
  const actionMessageParams = useMemo(() => getActionMessageParams(rule?.type), [rule?.type]);

  const { indexPattern, isIndexPatternLoading } = useRuleIndexPattern({
    dataSourceType: defineStepData.dataSourceType,
    index: memoizedIndex,
    dataViewId: defineStepData.dataViewId,
  });

  const customizationDisabledTooltip =
    !canEditRule && customizationDisabledReason === PrebuiltRulesCustomizationDisabledReason.License
      ? prebuiltCustomizationUpsellingMessage
      : undefined;

  const tabs = useMemo(
    () => [
      {
        'data-test-subj': 'edit-rule-define-tab',
        id: RuleStep.defineRule,
        name: ruleI18n.DEFINITION,
        disabled: !canEditRule,
        tooltip: customizationDisabledTooltip,
        content: (
          <div
            style={{
              display: activeStep === RuleStep.defineRule ? undefined : 'none',
            }}
          >
            <EuiSpacer />
            <StepPanel loading={loading || isSavedQueryLoading} title={ruleI18n.DEFINITION}>
              {!isSavedQueryLoading && (
                <StepDefineRule
                  isLoading={loading || isLoading || isSavedQueryLoading}
                  isUpdateView
                  indicesConfig={indicesConfig}
                  defaultSavedQuery={savedQuery}
                  form={defineStepForm}
                  key="defineStep"
                  indexPattern={indexPattern}
                  isIndexPatternLoading={isIndexPatternLoading}
                  isQueryBarValid={isQueryBarValid}
                  setIsQueryBarValid={setIsQueryBarValid}
                  index={memoizedIndex}
                  threatIndex={defineStepData.threatIndex}
                  alertSuppressionFields={defineStepData[ALERT_SUPPRESSION_FIELDS_FIELD_NAME]}
                  dataSourceType={defineStepData.dataSourceType}
                  shouldLoadQueryDynamically={defineStepData.shouldLoadQueryDynamically}
                  queryBarTitle={defineStepData.queryBar.title}
                  queryBarSavedId={defineStepData.queryBar.saved_id}
                />
              )}
              <EuiSpacer />
            </StepPanel>
          </div>
        ),
      },
      {
        'data-test-subj': 'edit-rule-about-tab',
        id: RuleStep.aboutRule,
        name: ruleI18n.ABOUT,
        disabled: !canEditRule,
        tooltip: customizationDisabledTooltip,
        content: (
          <div
            style={{
              display: activeStep === RuleStep.aboutRule ? undefined : 'none',
            }}
          >
            <EuiSpacer />
            <StepPanel loading={loading} title={ruleI18n.ABOUT}>
              {aboutStepData != null && defineStepData != null && (
                <StepAboutRule
                  isLoading={isLoading}
                  isUpdateView
                  ruleType={defineStepData.ruleType}
                  machineLearningJobId={defineStepData.machineLearningJobId}
                  index={memoizedIndex}
                  dataViewId={defineStepData.dataViewId}
                  timestampOverride={aboutStepData.timestampOverride}
                  form={aboutStepForm}
                  esqlQuery={esqlQueryForAboutStep}
                  key="aboutStep"
                  ruleSource={rule.rule_source}
                />
              )}
              <EuiSpacer />
            </StepPanel>
          </div>
        ),
      },
      {
        'data-test-subj': 'edit-rule-schedule-tab',
        id: RuleStep.scheduleRule,
        name: ruleI18n.SCHEDULE,
        disabled: !canEditRule,
        tooltip: customizationDisabledTooltip,
        content: (
          <div
            style={{
              display: activeStep === RuleStep.scheduleRule ? undefined : 'none',
            }}
          >
            <EuiSpacer />
            <StepPanel loading={loading} title={ruleI18n.SCHEDULE}>
              {scheduleStepData != null && (
                <StepScheduleRule
                  isLoading={isLoading}
                  isUpdateView
                  form={scheduleStepForm}
                  key="scheduleStep"
                />
              )}
              <EuiSpacer />
            </StepPanel>
          </div>
        ),
      },
      {
        'data-test-subj': 'edit-rule-actions-tab',
        id: RuleStep.ruleActions,
        name: ruleI18n.ACTIONS,
        content: (
          <div
            style={{
              display: activeStep === RuleStep.ruleActions ? undefined : 'none',
            }}
          >
            <EuiSpacer />
            <StepPanel loading={loading}>
              {actionsStepData != null && (
                <StepRuleActions
                  ruleId={rule?.id}
                  isLoading={isLoading}
                  isUpdateView
                  actionMessageParams={actionMessageParams}
                  summaryActionMessageParams={actionMessageParams}
                  form={actionsStepForm}
                  key="actionsStep"
                />
              )}
              <EuiSpacer />
            </StepPanel>
          </div>
        ),
      },
    ],
    [
      canEditRule,
      customizationDisabledTooltip,
      activeStep,
      loading,
      isSavedQueryLoading,
      isLoading,
      indicesConfig,
      savedQuery,
      defineStepForm,
      indexPattern,
      isIndexPatternLoading,
      isQueryBarValid,
      memoizedIndex,
      defineStepData,
      aboutStepData,
      aboutStepForm,
      esqlQueryForAboutStep,
      rule.rule_source,
      rule?.id,
      scheduleStepData,
      scheduleStepForm,
      actionsStepData,
      actionMessageParams,
      actionsStepForm,
    ]
  );

  const { startTransaction } = useStartTransaction();

  const defineFieldsTransform = useExperimentalFeatureFieldsTransform<DefineStepRule>();

  const saveChanges = useCallback(async () => {
    startTransaction({ name: SINGLE_RULE_ACTIONS.SAVE });
    const localDefineStepData: DefineStepRule = defineFieldsTransform({
      ...defineStepData,
    });
    const updatedRule = await updateRule({
      ...formatRule<RuleUpdateProps>(
        localDefineStepData,
        aboutStepData,
        scheduleStepData,
        actionsStepData,
        triggersActionsUi.actionTypeRegistry,
        rule?.exceptions_list
      ),
      ...(ruleId ? { id: ruleId } : {}),
    });

    addSuccess(i18n.SUCCESSFULLY_SAVED_RULE(updatedRule?.name ?? ''));
    navigateToApp(APP_UI_ID, {
      deepLinkId: SecurityPageName.rules,
      path: getRuleDetailsUrl(ruleId ?? ''),
    });
  }, [
    aboutStepData,
    actionsStepData,
    defineStepData,
    defineFieldsTransform,
    addSuccess,
    navigateToApp,
    rule?.exceptions_list,
    ruleId,
    scheduleStepData,
    startTransaction,
    triggersActionsUi.actionTypeRegistry,
    updateRule,
  ]);

  const onSubmit = useCallback(async () => {
    const actionsStepFormValid = await actionsStepForm.validate();
    if (!canEditRule) {
      // Since users cannot edit Define, About and Schedule tabs of the rule, we skip validation of those to avoid
      // user confusion of seeing that those tabs have error and not being able to see or do anything about that.
      if (actionsStepFormValid) {
        await saveChanges();
      }
      return;
    }

    const defineStepFormValid = await defineStepForm.validate();
    const aboutStepFormValid = await aboutStepForm.validate();
    const scheduleStepFormValid = await scheduleStepForm.validate();

    if (
      !defineStepFormValid ||
      !aboutStepFormValid ||
      !scheduleStepFormValid ||
      !actionsStepFormValid
    ) {
      return;
    }

    const defineRuleWarnings = defineStepForm.getValidationWarnings();
    const aboutRuleWarnings = aboutStepForm.getValidationWarnings();
    const scheduleRuleWarnings = scheduleStepForm.getValidationWarnings();
    const ruleActionsWarnings = actionsStepForm.getValidationWarnings();

    const warnings = extractValidationMessages(
      [
        ...defineRuleWarnings,
        ...aboutRuleWarnings,
        ...scheduleRuleWarnings,
        ...ruleActionsWarnings,
      ],
      VALIDATION_WARNING_CODE_FIELD_NAME_MAP
    );

    if (!(await confirmValidationErrors(warnings))) {
      return;
    }

    await saveChanges();
  }, [
    actionsStepForm,
    canEditRule,
    defineStepForm,
    aboutStepForm,
    scheduleStepForm,
    confirmValidationErrors,
    saveChanges,
  ]);

  const onTabClick = useCallback(async (tab: EuiTabbedContentTab) => {
    const targetStep = tab.id as RuleStep;
    setActiveStep(targetStep);
  }, []);

  const renderTabs = () => {
    return tabs.map((tab, index) => (
      <EuiToolTip key={index} position="top" content={tab.tooltip}>
        <EuiTab
          onClick={() => onTabClick(tab)}
          isSelected={tab.id === activeStep}
          disabled={tab.disabled}
          data-test-subj={tab['data-test-subj']}
        >
          {tab.name}
        </EuiTab>
      </EuiToolTip>
    ));
  };

  const goToDetailsRule = useCallback(
    (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.rules,
        path: getRuleDetailsUrl(ruleId ?? ''),
      });
    },
    [navigateToApp, ruleId]
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
  } else if (!hasUserCRUDPermission(canUserCRUD)) {
    navigateToApp(APP_UI_ID, {
      deepLinkId: SecurityPageName.rules,
      path: getRuleDetailsUrl(ruleId ?? ''),
    });
    return null;
  }

  return (
    <>
      {confirmSavingWithWarningModal}
      <SecuritySolutionPageWrapper>
        <EuiResizableContainer>
          {(EuiResizablePanel, EuiResizableButton, { togglePanel }) => {
            collapseFn.current = () => togglePanel?.('preview', { direction: 'left' });
            return (
              <>
                <EuiResizablePanel initialSize={70} minSize={'40%'} mode="main">
                  <EuiFlexGroup direction="row" justifyContent="spaceAround">
                    <MaxWidthEuiFlexItem>
                      <CustomHeaderPageMemo
                        backOptions={backOptions}
                        isLoading={isLoading}
                        title={i18n.PAGE_TITLE}
                        isRulePreviewVisible={isRulePreviewVisible}
                        setIsRulePreviewVisible={setIsRulePreviewVisible}
                        togglePanel={togglePanel}
                      />
                      {invalidSteps.length > 0 && (
                        <EuiCallOut title={i18n.SORRY_ERRORS} color="danger" iconType="warning">
                          <FormattedMessage
                            id="xpack.securitySolution.detectionEngine.rule.editRule.errorMsgDescription"
                            defaultMessage="You have an invalid input in {countError, plural, one {this tab} other {these tabs}}: {tabHasError}"
                            values={{
                              countError: invalidSteps.length,
                              tabHasError: invalidSteps
                                .map((t) => {
                                  if (t === RuleStep.aboutRule) {
                                    return ruleI18n.ABOUT;
                                  } else if (t === RuleStep.defineRule) {
                                    return ruleI18n.DEFINITION;
                                  } else if (t === RuleStep.scheduleRule) {
                                    return ruleI18n.SCHEDULE;
                                  } else if (t === RuleStep.ruleActions) {
                                    return ruleI18n.RULE_ACTIONS;
                                  }
                                  return t;
                                })
                                .join(', '),
                            }}
                          />
                        </EuiCallOut>
                      )}

                      <EuiTabs>{renderTabs()}</EuiTabs>

                      {tabs.map((tab) => tab.content)}

                      <EuiSpacer />

                      <EuiFlexGroup
                        alignItems="center"
                        gutterSize="s"
                        justifyContent="flexEnd"
                        responsive={false}
                      >
                        <EuiFlexItem grow={false}>
                          <EuiButton iconType="cross" onClick={goToDetailsRule}>
                            {i18n.CANCEL}
                          </EuiButton>
                        </EuiFlexItem>

                        <EuiFlexItem grow={false}>
                          <EuiButton
                            data-test-subj="ruleEditSubmitButton"
                            fill
                            onClick={onSubmit}
                            iconType="save"
                            isLoading={isLoading}
                            isDisabled={loading}
                          >
                            {i18n.SAVE_CHANGES}
                          </EuiButton>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </MaxWidthEuiFlexItem>
                  </EuiFlexGroup>
                </EuiResizablePanel>
                <EuiResizableButton />

                <EuiResizablePanel
                  id={'preview'}
                  mode="collapsible"
                  initialSize={30}
                  minSize={'20%'}
                  onToggleCollapsed={() => setIsRulePreviewVisible((isVisible) => !isVisible)}
                >
                  <RulePreview
                    isDisabled={isPreviewDisabled}
                    defineRuleData={defineStepData}
                    aboutRuleData={aboutStepData}
                    scheduleRuleData={scheduleStepData}
                    exceptionsList={rule?.exceptions_list}
                  />
                </EuiResizablePanel>
              </>
            );
          }}
        </EuiResizableContainer>
      </SecuritySolutionPageWrapper>

      <SpyRoute pageName={SecurityPageName.rules} state={{ ruleName: rule?.name }} />
    </>
  );
};

const EditRulePageWrapper: FC = () => {
  const { detailName: ruleId } = useParams<{ detailName: string }>();
  const { data: rule } = useRule(ruleId, true);
  return rule != null ? <EditRulePageComponent rule={rule} /> : <></>;
};

export const EditRulePage = memo(EditRulePageWrapper);
