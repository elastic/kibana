/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiSpacer, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { MaintenanceWindowCallout } from '@kbn/alerts-ui-shared';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderMenu, AppHeaderTab } from '@kbn/app-header';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import { i18n as i18nCore } from '@kbn/i18n';
import { APP_UI_ID, SECURITY_RULE_ATTACHMENT_ID, SecurityAgentBuilderAttachments } from '../../../../../common/constants';
import { SecurityPageName } from '../../../../app/types';
import { useGetSecuritySolutionLinkProps } from '../../../../common/components/links';
import { getDetectionEngineUrl } from '../../../../common/components/link_to/redirect_to_detection_engine';
import { SecuritySolutionPageWrapper } from '../../../../common/components/page_wrapper';
import { useBoolState } from '../../../../common/hooks/use_bool_state';
import { useKibana } from '../../../../common/lib/kibana';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';
import { useRouteSpy } from '../../../../common/utils/route/use_route_spy';
import { MissingDetectionsPrivilegesCallOut } from '../../../../detections/components/callouts/missing_detections_privileges_callout';
import { MlJobCompatibilityCallout } from '../../components/ml_job_compatibility_callout';
import { NeedAdminForUpdateRulesCallOut } from '../../../rule_management/components/callouts/need_admin_for_update_rules_callout';
import { ValueListsFlyout } from '../../components/value_lists_management_flyout';
import { useUserData } from '../../../../detections/components/user_info';
import { useListsConfig } from '../../../../detections/containers/detection_engine/lists/use_lists_config';
import { redirectToDetections } from '../../../common/helpers';
import * as i18n from '../../../common/translations';
import { AllRules } from '../../components/rules_table';
import { RulesTableContextProvider } from '../../components/rules_table/rules_table/rules_table_context';
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
import { usePrebuiltRulesStatus } from '../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_status';
import { useRuleManagementFilters } from '../../../rule_management/logic/use_rule_management_filters';
import { AllRulesTabs } from '../../components/rules_table/rules_table_toolbar';
import * as rulesTableI18n from '../../components/rules_table/translations';
import { ML_JOB_SETTINGS } from '../../../../common/components/ml_popover/translations';
import { MlJobSettingsFlyout } from '../../../../common/components/ml_popover/ml_job_settings_flyout';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { RuleCreationEventTypes } from '../../../../common/lib/telemetry/types';
const CREATE_RULE_LABEL = i18nCore.translate(
  'xpack.securitySolution.detectionEngine.rules.createRuleAppHeaderButton',
  { defaultMessage: 'Create rule' }
);

const AI_RULE_CREATION_INITIAL_MESSAGE = `Create ES|QL SIEM detection rule (name, description, data sources, detection logic, severity, risk score, schedule, tags, and MITRE ATT&CK mappings) using dedicated detection rule creation tool. Always render inline the latest version of the rule attachment.

You can review and edit everything before enabling the rule. 
Desired behavior or activity to detect:

==== YOUR DESCRIPTION HERE====
`;

interface RulesHeaderSharedProps {
  loading: boolean;
  canReadRules: boolean;
  canEditRules: boolean;
  canAccessRuleSettings: boolean;
  isImportValueListDisabled: boolean;
  isAiRuleCreationAvailable: boolean;
  showValueListFlyout: () => void;
  showImportModal: () => void;
  openRuleSettingsModal: () => void;
  showMlJobSettingsFlyout: () => void;
}

const RulesHeader: React.FC<RulesHeaderSharedProps> = ({
  loading,
  canReadRules,
  canEditRules,
  canAccessRuleSettings,
  isImportValueListDisabled,
  isAiRuleCreationAvailable,
  showValueListFlyout,
  showImportModal,
  openRuleSettingsModal,
  showMlJobSettingsFlyout,
}) => {
  const { docLinks, application, agentBuilder, telemetry, aiRuleCreation } = useKibana().services;
  const getSecuritySolutionLinkProps = useGetSecuritySolutionLinkProps();
  const { href: addElasticRulesHref } = getSecuritySolutionLinkProps({
    deepLinkId: SecurityPageName.rulesAdd,
  });
  const { href: createRuleHref } = getSecuritySolutionLinkProps({
    deepLinkId: SecurityPageName.rulesCreate,
  });

  const { data: ruleManagementFilters } = useRuleManagementFilters();
  const { data: prebuiltRulesStatus } = usePrebuiltRulesStatus();
  const [{ tabName }] = useRouteSpy();

  const installedTotal =
    (ruleManagementFilters?.rules_summary.custom_count ?? 0) +
    (ruleManagementFilters?.rules_summary.prebuilt_installed_count ?? 0);
  const updateTotal = prebuiltRulesStatus?.stats.num_prebuilt_rules_to_upgrade ?? 0;
  const newRulesCount = prebuiltRulesStatus?.stats.num_prebuilt_rules_to_install ?? 0;
  const shouldDisplayRuleUpdatesTab = canReadRules && updateTotal > 0;

  const goToTab = useCallback(
    (tab: AllRulesTabs) => {
      application.navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.rules,
        path: tab,
      });
    },
    [application]
  );

  const tabs = useMemo<AppHeaderTab[]>(() => {
    const next: AppHeaderTab[] = [
      {
        id: AllRulesTabs.management,
        label: rulesTableI18n.INSTALLED_RULES_TAB,
        isSelected: tabName === AllRulesTabs.management || tabName == null,
        badge: installedTotal > 0 ? installedTotal : undefined,
        onClick: () => goToTab(AllRulesTabs.management),
        'data-test-subj': 'rulesAppHeaderTabManagement',
      },
      {
        id: AllRulesTabs.monitoring,
        label: rulesTableI18n.RULE_MONITORING_TAB,
        isSelected: tabName === AllRulesTabs.monitoring,
        badge: installedTotal > 0 ? installedTotal : undefined,
        onClick: () => goToTab(AllRulesTabs.monitoring),
        'data-test-subj': 'rulesAppHeaderTabMonitoring',
      },
    ];
    if (shouldDisplayRuleUpdatesTab) {
      next.push({
        id: AllRulesTabs.updates,
        label: rulesTableI18n.RULE_UPDATES_TAB,
        isSelected: tabName === AllRulesTabs.updates,
        badge: updateTotal > 0 ? updateTotal : undefined,
        onClick: () => goToTab(AllRulesTabs.updates),
        'data-test-subj': 'rulesAppHeaderTabUpdates',
      });
    }
    return next;
  }, [goToTab, installedTotal, shouldDisplayRuleUpdatesTab, tabName, updateTotal]);

  const handleAiRuleCreation = useCallback(() => {
    const session = aiRuleCreation.startSession();
    telemetry.reportEvent(RuleCreationEventTypes.CreationInitialized, {
      creationSource: 'ai',
      sessionId: session.sessionId,
    });

    const emptyRuleAttachment: AttachmentInput = {
      id: SECURITY_RULE_ATTACHMENT_ID,
      type: SecurityAgentBuilderAttachments.rule,
      data: {
        text: JSON.stringify({}),
        attachmentLabel: 'New Rule',
      },
    };

    agentBuilder?.openChat?.({
      newConversation: true,
      initialMessage: AI_RULE_CREATION_INITIAL_MESSAGE,
      autoSendInitialMessage: false,
      sessionTag: 'security',
      attachments: [emptyRuleAttachment],
    });
  }, [agentBuilder, aiRuleCreation, telemetry]);

  const addElasticRulesLabel =
    newRulesCount > 0
      ? i18nCore.translate(
          'xpack.securitySolution.detectionEngine.rules.addElasticRulesWithCount',
          {
            defaultMessage: 'Add Elastic rules ({count})',
            values: { count: newRulesCount },
          }
        )
      : i18nCore.translate('xpack.securitySolution.detectionEngine.rules.addElasticRulesLabel', {
          defaultMessage: 'Add Elastic rules',
        });

  const menu = useMemo<AppHeaderMenu>(() => {
    const items: NonNullable<AppHeaderMenu['items']> = [
      {
        id: 'addElasticRules',
        label: addElasticRulesLabel,
        iconType: 'plusCircle',
        href: addElasticRulesHref,
        disableButton: !canReadRules || loading,
        testId: 'addElasticRulesButton',
        run: () => {
          application.navigateToApp(APP_UI_ID, { deepLinkId: SecurityPageName.rulesAdd });
        },
      },
      {
        id: 'ruleSettings',
        label: i18n.RULE_SETTINGS_TITLE,
        iconType: 'gear',
        testId: 'rules-settings-button',
        disableButton: !canAccessRuleSettings,
        run: () => {
          openRuleSettingsModal();
        },
      },
    ];

    // Kebab (overflow) — value lists, import, ML job settings, then Docs/Feedback divider.
    items.push(
      {
        id: 'manageValueLists',
        label: i18n.IMPORT_VALUE_LISTS,
        iconType: 'download',
        overflow: true,
        disableButton: isImportValueListDisabled,
        tooltipContent: i18n.UPLOAD_VALUE_LISTS_TOOLTIP,
        testId: 'open-value-lists-modal-button',
        run: () => {
          showValueListFlyout();
        },
      },
      {
        id: 'importRules',
        label: i18n.IMPORT_RULE,
        iconType: 'download',
        overflow: true,
        disableButton: !canEditRules || loading,
        testId: 'rules-import-modal-button',
        run: () => {
          showImportModal();
        },
      },
      {
        id: 'mlJobSettings',
        label: ML_JOB_SETTINGS,
        iconType: 'productML',
        overflow: true,
        testId: 'rulesHeaderMlJobSettings',
        run: () => {
          showMlJobSettingsFlyout();
        },
      }
    );

    const createRuleItems = [];

    if (isAiRuleCreationAvailable) {
      createRuleItems.push({
        id: 'aiRuleCreation',
        label: i18nCore.translate(
          'xpack.securitySolution.detectionEngine.createRule.contextMenu.aiRuleCreation',
          { defaultMessage: 'AI rule creation' }
        ),
        iconType: 'productAgent' as const,
        testId: 'ai-rule-creation',
        run: () => {
          handleAiRuleCreation();
        },
      });
    }

    createRuleItems.push({
      id: 'manualRuleCreation',
      label: i18nCore.translate(
        'xpack.securitySolution.detectionEngine.createRule.contextMenu.manual',
        { defaultMessage: 'Manual rule creation' }
      ),
      iconType: 'document' as const,
      href: createRuleHref,
      testId: isAiRuleCreationAvailable ? 'manual-rule-creation' : 'create-new-rule',
    });

    // Dropdown chevron on the right (matches Figma / Old header).
    const primaryActionItem: AppHeaderMenu['primaryActionItem'] = {
      id: 'createRule',
      label: CREATE_RULE_LABEL,
      iconType: 'chevronSingleDown',
      disableButton: !canEditRules || loading,
      testId: isAiRuleCreationAvailable ? 'create-rule-button' : 'create-new-rule',
      items: createRuleItems,
    };

    return { items, primaryActionItem };
  }, [
    addElasticRulesHref,
    addElasticRulesLabel,
    application,
    canAccessRuleSettings,
    canEditRules,
    canReadRules,
    createRuleHref,
    handleAiRuleCreation,
    isAiRuleCreationAvailable,
    isImportValueListDisabled,
    loading,
    openRuleSettingsModal,
    showImportModal,
    showMlJobSettingsFlyout,
    showValueListFlyout,
  ]);

  return (
    // [Chrome Next] Migrated header — parent supplies the Figma 16px page grid via bleed.
    <AppHeader
      title={i18n.PAGE_TITLE}
      menu={menu}
      tabs={tabs}
      docLink={docLinks.links.siem.guide}
      spacing="bleed"
    />
  );
};

const RulesPageContent = () => {
  const [isImportModalVisible, showImportModal, hideImportModal] = useBoolState();
  const [isValueListFlyoutVisible, showValueListFlyout, hideValueListFlyout] = useBoolState();
  const [isRuleSettingsModalOpen, openRuleSettingsModal, closeRuleSettingsModal] = useBoolState();
  const [isMlJobSettingsFlyoutOpen, showMlJobSettingsFlyout, hideMlJobSettingsFlyout] =
    useBoolState();
  const kibanaServices = useKibana().services;
  const { application } = kibanaServices;
  const { navigateToApp } = application;
  const { euiTheme } = useEuiTheme();

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

  // Security section defaults to paddingSize "l" (24px). Figma uses 16px — same pattern as Dashboards.
  const chromeNextPage = css`
    margin: -${euiTheme.size.l};
    padding: ${euiTheme.size.base};
  `;

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

  const headerProps: RulesHeaderSharedProps = {
    loading,
    canReadRules,
    canEditRules,
    canAccessRuleSettings,
    isImportValueListDisabled,
    isAiRuleCreationAvailable,
    showValueListFlyout,
    showImportModal,
    openRuleSettingsModal,
    showMlJobSettingsFlyout,
  };

  const pageBody = (
    <>
      {isRuleSettingsModalOpen && canAccessRuleSettings && (
        <RuleSettingsModal isOpen={isRuleSettingsModalOpen} onClose={closeRuleSettingsModal} />
      )}
      <RuleUpdateCallouts shouldShowUpdateRulesCallout={canEditRules} />
      {deprecatedRulesCallout}
      <MaintenanceWindowCallout
        kibanaServices={kibanaServices}
        categories={[DEFAULT_APP_CATEGORIES.security.id]}
      />
      <AllRules showTableToolbar={false} />
    </>
  );

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
      <MlJobSettingsFlyout
        isOpen={isMlJobSettingsFlyoutOpen}
        onClose={hideMlJobSettingsFlyout}
      />

      <RulesTableContextProvider>
        <SecuritySolutionPageWrapper>
          <div css={chromeNextPage}>
            <RulesHeader {...headerProps} />
            <EuiSpacer size="m" />
            {pageBody}
          </div>
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
