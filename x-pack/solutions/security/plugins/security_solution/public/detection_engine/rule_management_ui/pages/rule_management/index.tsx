/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import { MaintenanceWindowCallout } from '@kbn/alerts-ui-shared';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import { APP_UI_ID } from '../../../../../common/constants';
import { SecurityPageName } from '../../../../app/types';
import { getDetectionEngineUrl } from '../../../../common/components/link_to/redirect_to_detection_engine';
import { SecuritySolutionPageWrapper } from '../../../../common/components/page_wrapper';
import { useBoolState } from '../../../../common/hooks/use_bool_state';
import { useKibana } from '../../../../common/lib/kibana';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';
import { MissingDetectionsPrivilegesCallOut } from '../../../../detections/components/callouts/missing_detections_privileges_callout';
import { MlJobCompatibilityCallout } from '../../components/ml_job_compatibility_callout';
import { NeedAdminForUpdateRulesCallOut } from '../../../rule_management/components/callouts/need_admin_for_update_rules_callout';
import { ADD_ELASTIC_RULES } from '../../components/pre_packaged_rules/translations';
import { ValueListsFlyout } from '../../components/value_lists_management_flyout';
import { useUserData } from '../../../../detections/components/user_info';
import { useListsConfig } from '../../../../detections/containers/detection_engine/lists/use_lists_config';
import { redirectToDetections } from '../../../common/helpers';
import * as i18n from '../../../common/translations';
import { AllRules } from '../../components/rules_table';
import { RulesTableAppHeader } from '../../components/rules_table/rules_table_app_header';
import { RulesTableContextProvider } from '../../components/rules_table/rules_table/rules_table_context';
import { RuleUpdateCallouts } from '../../components/rule_update_callouts/rule_update_callouts';
import { useDeprecatedRulesTableCallout } from '../../../rule_management/components/rule_deprecation';
import { usePrebuiltRulesStatus } from '../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_status';
import { RuleImportModal } from '../../components/rule_import_modal/rule_import_modal';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useCreateRulePrimaryAction } from '../../components/create_rule_menu/use_create_rule_primary_action';
import { RuleSettingsModal } from '../../../rule_gaps/components/rule_settings_modal';
import {
  GapAutoFillSchedulerProvider,
  useGapAutoFillSchedulerContext,
} from '../../../rule_gaps/context/gap_auto_fill_scheduler_context';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useAgentBuilderAvailability } from '../../../../agent_builder/hooks/use_agent_builder_availability';
import { useEsqlAvailability } from '../../../../common/hooks/esql/use_esql_availability';
import { CpsMlRuleCallout } from '../../components/cps_ml_rule_callout/callout';

const RulesPageContent = () => {
  const [isImportModalVisible, showImportModal, hideImportModal] = useBoolState();
  const [isValueListFlyoutVisible, showValueListFlyout, hideValueListFlyout] = useBoolState();
  const [isRuleSettingsModalOpen, openRuleSettingsModal, closeRuleSettingsModal] = useBoolState();
  const kibanaServices = useKibana().services;
  const { application } = kibanaServices;
  const { navigateToApp } = application;

  const [{ loading: userInfoLoading, isSignalIndexExists, isAuthenticated, hasEncryptionKey }] =
    useUserData();
  const { edit: canEditRules, read: canReadRules } = useUserPrivileges().rulesPrivileges.rules;
  const canEditRulesManagementSettings =
    useUserPrivileges().rulesPrivileges.rulesManagementSettings?.edit ?? false;
  const {
    loading: listsConfigLoading,
    canWriteIndex: canWriteListsIndex,
    needsConfiguration: needsListsConfiguration,
    needsIndex: needsListsIndex,
  } = useListsConfig();
  const loading = userInfoLoading || listsConfigLoading;
  const { canEditGapAutoFill } = useGapAutoFillSchedulerContext();
  const gapReasonDetectionEnabled = useIsExperimentalFeatureEnabled('gapReasonDetectionEnabled');
  const canSaveAdvancedSettings = application.capabilities.advancedSettings?.save === true;
  const canAccessRuleSettings =
    canEditRulesManagementSettings &&
    (canEditGapAutoFill || (gapReasonDetectionEnabled && canSaveAdvancedSettings));

  const aiRuleCreationEnabled = useIsExperimentalFeatureEnabled('aiRuleCreationEnabled');
  const { isAgentBuilderEnabled } = useAgentBuilderAvailability();
  const { isEsqlRuleTypeEnabled } = useEsqlAvailability();
  const isAiRuleCreationAvailable =
    aiRuleCreationEnabled && isAgentBuilderEnabled && isEsqlRuleTypeEnabled;
  const deprecatedRulesCallout = useDeprecatedRulesTableCallout();

  const { data: preBuiltRulesStatus } = usePrebuiltRulesStatus();
  const newRulesCount = preBuiltRulesStatus?.stats.num_prebuilt_rules_to_install ?? 0;
  const canAddIntegrations = application.capabilities.fleet?.read === true;

  const isImportValueListDisabled =
    needsListsIndex || !canWriteListsIndex || !canEditRules || loading;

  const createRulePrimaryAction = useCreateRulePrimaryAction({
    loading,
    isDisabled: !canEditRules || loading,
    isAiRuleCreationAvailable,
  });

  const appMenu = useMemo<AppMenuConfig>(() => {
    const items: NonNullable<AppMenuConfig['items']> = [];

    items.push({
      id: 'addElasticRules',
      label: newRulesCount > 0 ? `${ADD_ELASTIC_RULES} (${newRulesCount})` : ADD_ELASTIC_RULES,
      iconType: 'plusCircle',
      order: 10,
      run: () => navigateToApp(APP_UI_ID, { deepLinkId: SecurityPageName.rulesAdd }),
      testId: 'addElasticRulesButton',
      disableButton: !canReadRules || loading,
    });

    items.push({
      id: 'importValueLists',
      label: i18n.IMPORT_VALUE_LISTS,
      iconType: 'download',
      order: 20,
      run: showValueListFlyout,
      testId: 'open-value-lists-modal-button',
      disableButton: isImportValueListDisabled,
      tooltipContent: i18n.UPLOAD_VALUE_LISTS_TOOLTIP,
    });

    if (canAccessRuleSettings) {
      items.push({
        id: 'ruleSettings',
        label: i18n.RULE_SETTINGS_TITLE,
        iconType: 'gear',
        order: 30,
        overflow: true,
        run: openRuleSettingsModal,
        testId: 'rules-settings-button',
      });
    }

    items.push({
      id: 'importRule',
      label: i18n.IMPORT_RULE,
      iconType: 'download',
      order: 40,
      overflow: true,
      run: showImportModal,
      testId: 'rules-import-modal-button',
      disableButton: !canEditRules || loading,
    });

    return {
      primaryActionItem: createRulePrimaryAction,
      items,
    };
  }, [
    newRulesCount,
    navigateToApp,
    canReadRules,
    loading,
    showValueListFlyout,
    isImportValueListDisabled,
    canAccessRuleSettings,
    openRuleSettingsModal,
    showImportModal,
    canEditRules,
    createRulePrimaryAction,
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
      <NeedAdminForUpdateRulesCallOut />
      <MissingDetectionsPrivilegesCallOut />
      <CpsMlRuleCallout />
      <MlJobCompatibilityCallout />
      <ValueListsFlyout showFlyout={isValueListFlyoutVisible} onClose={hideValueListFlyout} />
      <RuleImportModal
        isImportModalVisible={isImportModalVisible}
        hideImportModal={hideImportModal}
      />

      <RulesTableContextProvider>
        <SecuritySolutionPageWrapper>
          <RulesTableAppHeader
            title={i18n.PAGE_TITLE}
            menu={appMenu}
            showAddIntegrations={canAddIntegrations}
          />
          {isRuleSettingsModalOpen && canAccessRuleSettings && (
            <RuleSettingsModal isOpen={isRuleSettingsModalOpen} onClose={closeRuleSettingsModal} />
          )}
          <RuleUpdateCallouts shouldShowUpdateRulesCallout={canEditRules} />
          <EuiSpacer size="s" />
          {deprecatedRulesCallout}
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
