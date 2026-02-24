/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useCallback } from 'react';
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
import { RuleUpdateCallouts } from '../../components/rule_update_callouts/rule_update_callouts';
import { RuleImportModal } from '../../components/rule_import_modal/rule_import_modal';
import { RuleSettingsModal } from '../../../rule_gaps/components/rule_settings_modal';
import {
  GapAutoFillSchedulerProvider,
  useGapAutoFillSchedulerContext,
} from '../../../rule_gaps/context/gap_auto_fill_scheduler_context';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { getRulesHeaderAppActionsConfig } from '../../../../app/home/header_app_actions/rules_header_app_actions_config';

const RulesPageContent = () => {
  const [isImportModalVisible, showImportModal, hideImportModal] = useBoolState();
  const [isValueListFlyoutVisible, showValueListFlyout, hideValueListFlyout] = useBoolState();
  const [isRuleSettingsModalOpen, openRuleSettingsModal, closeRuleSettingsModal] = useBoolState();
  const kibanaServices = useKibana().services;
  const { navigateToApp } = kibanaServices.application;
  const chrome = kibanaServices.chrome;

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

  const onAddElasticRules = useCallback(() => {
    navigateToApp(APP_UI_ID, { deepLinkId: SecurityPageName.rulesAdd });
  }, [navigateToApp]);

  const onCreateRule = useCallback(() => {
    navigateToApp(APP_UI_ID, { deepLinkId: SecurityPageName.rulesCreate });
  }, [navigateToApp]);

  useEffect(() => {
    if (chrome?.setHeaderAppActionsConfig) {
      chrome.setHeaderAppActionsConfig(
        getRulesHeaderAppActionsConfig({
          onAddElasticRules,
          onManageValueLists: showValueListFlyout,
          onImportRules: showImportModal,
          onSettings: openRuleSettingsModal,
          onCreateRule,
        })
      );
      return () => {
        chrome.setHeaderAppActionsConfig(undefined);
      };
    }
  }, [
    chrome,
    onAddElasticRules,
    showValueListFlyout,
    showImportModal,
    openRuleSettingsModal,
    onCreateRule,
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
      <MlJobCompatibilityCallout />
      <ValueListsFlyout showFlyout={isValueListFlyoutVisible} onClose={hideValueListFlyout} />
      <RuleImportModal
        isImportModalVisible={isImportModalVisible}
        hideImportModal={hideImportModal}
      />

      <RulesTableContextProvider>
        <SecuritySolutionPageWrapper>
          {/* No local header: page title and actions live in the global header (overflow + add button) */}
          {isRuleSettingsModalOpen && canAccessGapAutoFill && (
            <RuleSettingsModal isOpen={isRuleSettingsModalOpen} onClose={closeRuleSettingsModal} />
          )}
          <RuleUpdateCallouts shouldShowUpdateRulesCallout={canEditRules} />
          <EuiSpacer size="s" />
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
