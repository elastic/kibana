/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
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
import { ValueListsFlyout } from '../../components/value_lists_management_flyout';
import { useUserData } from '../../../../detections/components/user_info';
import { useListsConfig } from '../../../../detections/containers/detection_engine/lists/use_lists_config';
import { redirectToDetections } from '../../../common/helpers';
import { AllRules } from '../../components/rules_table';
import { RulesTableContextProvider } from '../../components/rules_table/rules_table/rules_table_context';
import { RulesTableAppHeader } from '../../components/rules_table_app_header/rules_table_app_header';
import { RuleUpdateCallouts } from '../../components/rule_update_callouts/rule_update_callouts';
import { useDeprecatedRulesTableCallout } from '../../../rule_management/components/rule_deprecation';
import { RuleImportModal } from '../../components/rule_import_modal/rule_import_modal';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { RuleSettingsModal } from '../../../rule_gaps/components/rule_settings_modal';
import {
  GapAutoFillSchedulerProvider,
  useGapAutoFillSchedulerContext,
} from '../../../rule_gaps/context/gap_auto_fill_scheduler_context';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useAgentBuilderAvailability } from '../../../../agent_builder/hooks/use_agent_builder_availability';
import { useEsqlAvailability } from '../../../../common/hooks/esql/use_esql_availability';

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
  const isImportValueListDisabled =
    needsListsIndex || !canWriteListsIndex || !canEditRules || loading;

  return (
    <>
      <RulesTableContextProvider>
        <RulesTableAppHeader
          isLoading={loading}
          canReadRules={canReadRules}
          canEditRules={canEditRules}
          canAccessRuleSettings={canAccessRuleSettings}
          isImportValueListDisabled={isImportValueListDisabled}
          isAiRuleCreationAvailable={isAiRuleCreationAvailable}
          onOpenRuleSettings={openRuleSettingsModal}
          onOpenValueLists={showValueListFlyout}
          onOpenImportRules={showImportModal}
        />
        <NeedAdminForUpdateRulesCallOut />
        <MissingDetectionsPrivilegesCallOut />
        <MlJobCompatibilityCallout />
        <ValueListsFlyout showFlyout={isValueListFlyoutVisible} onClose={hideValueListFlyout} />
        <RuleImportModal
          isImportModalVisible={isImportModalVisible}
          hideImportModal={hideImportModal}
        />

        <SecuritySolutionPageWrapper>
          {isRuleSettingsModalOpen && canAccessRuleSettings && (
            <RuleSettingsModal isOpen={isRuleSettingsModalOpen} onClose={closeRuleSettingsModal} />
          )}
          <EuiSpacer size="s" />
          <RuleUpdateCallouts shouldShowUpdateRulesCallout={canEditRules} />
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
