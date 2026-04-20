/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { MaintenanceWindowCallout } from '@kbn/alerts-ui-shared';
import { AppMenu } from '@kbn/core-chrome-app-menu';
import type { AppMenuConfig, AppMenuItemType } from '@kbn/core-chrome-app-menu-components';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import { useNavigateTo } from '@kbn/security-solution-navigation';
import useObservable from 'react-use/lib/useObservable';
import { APP_UI_ID } from '../../../../../common/constants';
import { SecurityPageName } from '../../../../app/types';
import {
  SecuritySolutionLinkButton,
  useGetSecuritySolutionLinkProps,
} from '../../../../common/components/links';
import { getDetectionEngineUrl } from '../../../../common/components/link_to/redirect_to_detection_engine';
import { SecuritySolutionPageWrapper } from '../../../../common/components/page_wrapper';
import { useBoolState } from '../../../../common/hooks/use_bool_state';
import { useKibana } from '../../../../common/lib/kibana';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';
import { MissingDetectionsPrivilegesCallOut } from '../../../../detections/components/callouts/missing_detections_privileges_callout';
import { MlJobCompatibilityCallout } from '../../components/ml_job_compatibility_callout';
import { NeedAdminForUpdateRulesCallOut } from '../../../rule_management/components/callouts/need_admin_for_update_rules_callout';
import { AddElasticRulesButton } from '../../components/pre_packaged_rules/add_elastic_rules_button';
import { ADD_ELASTIC_RULES } from '../../components/pre_packaged_rules/translations';
import { usePrebuiltRulesStatus } from '../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_status';
import { ValueListsFlyout } from '../../components/value_lists_management_flyout';
import { useUserData } from '../../../../detections/components/user_info';
import { useListsConfig } from '../../../../detections/containers/detection_engine/lists/use_lists_config';
import { redirectToDetections } from '../../../common/helpers';
import * as i18n from '../../../common/translations';
import { AllRules } from '../../components/rules_table';
import { RulesTableContextProvider } from '../../components/rules_table/rules_table/rules_table_context';
import { HeaderPage } from '../../../../common/components/header_page';
import { RuleUpdateCallouts } from '../../components/rule_update_callouts/rule_update_callouts';
import { RuleImportModal } from '../../components/rule_import_modal/rule_import_modal';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { CreateRuleMenu } from '../../components/create_rule_menu';
import { RuleSettingsModal } from '../../../rule_gaps/components/rule_settings_modal';
import {
  GapAutoFillSchedulerProvider,
  useGapAutoFillSchedulerContext,
} from '../../../rule_gaps/context/gap_auto_fill_scheduler_context';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useAgentBuilderAvailability } from '../../../../agent_builder/hooks/use_agent_builder_availability';

const RulesPageContent = () => {
  const [isImportModalVisible, showImportModal, hideImportModal] = useBoolState();
  const [isValueListFlyoutVisible, showValueListFlyout, hideValueListFlyout] = useBoolState();
  const [isRuleSettingsModalOpen, openRuleSettingsModal, closeRuleSettingsModal] = useBoolState();
  const kibanaServices = useKibana().services;
  const { navigateToApp } = kibanaServices.application;
  const { chrome } = kibanaServices;
  const chromeStyle$ = useMemo(() => chrome.getChromeStyle$(), [chrome]);
  const chromeStyle = useObservable(chromeStyle$, chrome.getChromeStyle());
  const isProjectChrome = chromeStyle === 'project';

  const [{ loading: userInfoLoading, isSignalIndexExists, isAuthenticated, hasEncryptionKey }] =
    useUserData();
  const { edit: canEditRules, read: canReadRules } = useUserPrivileges().rulesPrivileges.rules;
  const {
    loading: listsConfigLoading,
    canWriteIndex: canWriteListsIndex,
    canCreateIndex: canCreateListsIndex,
    needsConfiguration: needsListsConfiguration,
    needsIndex: needsListsIndex,
  } = useListsConfig();
  const loading = userInfoLoading || listsConfigLoading;
  const { canAccessGapAutoFill } = useGapAutoFillSchedulerContext();

  // Value lists: disable when lists index is missing and user cannot create it, or when write/edit is blocked.
  const cantCreateNonExistentListIndex = needsListsIndex && !canCreateListsIndex;
  const isImportValueListDisabled =
    cantCreateNonExistentListIndex || !canWriteListsIndex || !canEditRules || loading;

  const getSecuritySolutionLinkProps = useGetSecuritySolutionLinkProps();
  const { navigateTo } = useNavigateTo();
  const addElasticRulesLinkProps = useMemo(
    () => getSecuritySolutionLinkProps({ deepLinkId: SecurityPageName.rulesAdd }),
    [getSecuritySolutionLinkProps]
  );
  const { data: preBuiltRulesStatus } = usePrebuiltRulesStatus();
  const newRulesCount = preBuiltRulesStatus?.stats.num_prebuilt_rules_to_install ?? 0;

  const aiRuleCreationEnabled = useIsExperimentalFeatureEnabled('aiRuleCreationEnabled');
  const { isAgentBuilderEnabled } = useAgentBuilderAvailability();
  const isAiRuleCreationAvailable = aiRuleCreationEnabled && isAgentBuilderEnabled;

  const addCreateRuleLinkProps = useMemo(
    () => getSecuritySolutionLinkProps({ deepLinkId: SecurityPageName.rulesCreate }),
    [getSecuritySolutionLinkProps]
  );

  const rulesProjectAppMenuConfig = useMemo((): AppMenuConfig | undefined => {
    if (!isProjectChrome) {
      return undefined;
    }
    const importRulesOverflowItem: AppMenuItemType = {
      id: 'security-detection-rules-import-rules',
      order: 0,
      label: i18n.IMPORT_RULE,
      iconType: 'importAction',
      testId: 'rules-import-modal-button',
      disableButton: !canEditRules || loading,
      run: () => {
        showImportModal();
      },
    };
    return {
      layout: 'chromeBarV2',
      hideProjectHeaderBackButton: true,
      secondaryActionItems: [
        {
          id: 'security-detection-rules-add-elastic',
          label: ADD_ELASTIC_RULES,
          ...(newRulesCount > 0
            ? {
                labelAppend: (
                  <EuiBadge
                    color="#E0E5EE"
                    css={css`
                      margin-left: 5px;
                    `}
                  >
                    {newRulesCount}
                  </EuiBadge>
                ),
              }
            : {}),
          iconType: 'plus',
          testId: 'addElasticRulesButton',
          href: addElasticRulesLinkProps.href,
          target: '_self',
          disableButton: !canReadRules || loading,
          run: () => {
            navigateTo({ url: addElasticRulesLinkProps.href });
          },
        },
        {
          id: 'security-detection-rules-value-lists',
          label: i18n.IMPORT_VALUE_LISTS,
          iconType: 'importAction',
          testId: 'open-value-lists-modal-button',
          disableButton: isImportValueListDisabled,
          tooltipContent: () =>
            cantCreateNonExistentListIndex
              ? i18n.UPLOAD_VALUE_LISTS_PRIVILEGES_TOOLTIP
              : i18n.UPLOAD_VALUE_LISTS_TOOLTIP,
          run: () => {
            showValueListFlyout();
          },
        },
        ...(canAccessGapAutoFill
          ? [
              {
                id: 'security-detection-rules-settings',
                label: i18n.RULE_SETTINGS_TITLE,
                iconType: 'gear',
                testId: 'rules-settings-button',
                run: () => {
                  openRuleSettingsModal();
                },
              },
            ]
          : []),
      ],
      overflowOnlyItems: [importRulesOverflowItem],
      ...(!isAiRuleCreationAvailable
        ? {
            primaryActionItem: {
              id: 'security-detection-rules-create-new',
              label: i18n.ADD_NEW_RULE,
              iconType: 'plus',
              testId: 'create-new-rule',
              href: addCreateRuleLinkProps.href,
              target: '_self',
              disableButton: !canEditRules || loading,
              isFilled: false,
              run: () => {
                navigateTo({ url: addCreateRuleLinkProps.href });
              },
            },
          }
        : {}),
    };
  }, [
    isProjectChrome,
    isAiRuleCreationAvailable,
    newRulesCount,
    addElasticRulesLinkProps.href,
    addCreateRuleLinkProps.href,
    canReadRules,
    canEditRules,
    loading,
    showImportModal,
    showValueListFlyout,
    cantCreateNonExistentListIndex,
    isImportValueListDisabled,
    canAccessGapAutoFill,
    openRuleSettingsModal,
    navigateTo,
  ]);

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
  }

  return (
    <>
      {isProjectChrome && rulesProjectAppMenuConfig ? (
        <AppMenu config={rulesProjectAppMenuConfig} setAppMenu={chrome.setAppMenu} />
      ) : null}
      <NeedAdminForUpdateRulesCallOut />
      <MissingDetectionsPrivilegesCallOut />
      <MlJobCompatibilityCallout />
      <ValueListsFlyout showFlyout={isValueListFlyoutVisible} onClose={hideValueListFlyout} />
      <RuleImportModal
        isImportModalVisible={isImportModalVisible}
        hideImportModal={hideImportModal}
      />

      <RulesTableContextProvider>
        <SecuritySolutionPageWrapper>
          {!isProjectChrome ? (
            <HeaderPage title={i18n.PAGE_TITLE}>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={true}>
                {canAccessGapAutoFill && (
                  <EuiButtonEmpty
                    data-test-subj="rules-settings-button"
                    iconType="gear"
                    onClick={openRuleSettingsModal}
                  >
                    {i18n.RULE_SETTINGS_TITLE}
                  </EuiButtonEmpty>
                )}
                <EuiFlexItem grow={false}>
                  <AddElasticRulesButton isDisabled={!canReadRules || loading} />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiToolTip
                    position="top"
                    content={
                      cantCreateNonExistentListIndex
                        ? i18n.UPLOAD_VALUE_LISTS_PRIVILEGES_TOOLTIP
                        : i18n.UPLOAD_VALUE_LISTS_TOOLTIP
                    }
                  >
                    <EuiButtonEmpty
                      data-test-subj="open-value-lists-modal-button"
                      iconType="importAction"
                      isDisabled={isImportValueListDisabled}
                      onClick={showValueListFlyout}
                    >
                      {i18n.IMPORT_VALUE_LISTS}
                    </EuiButtonEmpty>
                  </EuiToolTip>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    data-test-subj="rules-import-modal-button"
                    iconType="importAction"
                    isDisabled={!canEditRules || loading}
                    onClick={showImportModal}
                  >
                    {i18n.IMPORT_RULE}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  {isAiRuleCreationAvailable ? (
                    <CreateRuleMenu loading={loading} isDisabled={!canEditRules || loading} />
                  ) : (
                    <SecuritySolutionLinkButton
                      data-test-subj="create-new-rule"
                      fill
                      iconType="plus"
                      isDisabled={!canEditRules || loading}
                      deepLinkId={SecurityPageName.rulesCreate}
                    >
                      {i18n.ADD_NEW_RULE}
                    </SecuritySolutionLinkButton>
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
            </HeaderPage>
          ) : null}
          {isProjectChrome && isAiRuleCreationAvailable ? (
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={true}>
              <EuiFlexItem grow={false}>
                <CreateRuleMenu loading={loading} isDisabled={!canEditRules || loading} />
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : null}
          {isRuleSettingsModalOpen && canAccessGapAutoFill && (
            <RuleSettingsModal isOpen={isRuleSettingsModalOpen} onClose={closeRuleSettingsModal} />
          )}
          <RuleUpdateCallouts shouldShowUpdateRulesCallout={canEditRules} />
          {!isProjectChrome ? <EuiSpacer size="s" /> : null}
          <MaintenanceWindowCallout
            kibanaServices={kibanaServices}
            categories={[DEFAULT_APP_CATEGORIES.security.id]}
          />
          <AllRules data-test-subj="all-rules" />
        </SecuritySolutionPageWrapper>
      </RulesTableContextProvider>

      <SpyRoute pageName={SecurityPageName.rules} />
    </>
  );
};

const RulesPageComponent = () => (
  <GapAutoFillSchedulerProvider>
    <RulesPageContent />
  </GapAutoFillSchedulerProvider>
);

export const RulesPage = React.memo(RulesPageComponent);
