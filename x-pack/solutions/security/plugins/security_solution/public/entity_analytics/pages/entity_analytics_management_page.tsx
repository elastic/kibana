/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeader,
  EuiHorizontalRule,
  EuiButton,
  EuiLoadingSpinner,
  EuiText,
  EuiSpacer,
  EuiTabs,
  EuiTab,
  EuiCallOut,
  EuiCode,
  EuiSwitch,
  EuiHealth,
  EuiConfirmModal,
  EuiButtonEmpty,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import moment from 'moment';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n as i18nCore } from '@kbn/i18n';
import { useMutation } from '@kbn/react-query';
import type { SecurityAppError } from '@kbn/securitysolution-t-grid';

import { type StoreStatus } from '../../../common/api/entity_analytics';
import { ASSET_CRITICALITY_INDEX_PATTERN } from '../../../common/entity_analytics/asset_criticality';

import { RiskScorePreviewSection } from '../components/risk_score_management/risk_score_preview_section';
import { RiskScoreEnableSection } from '../components/risk_score_management/risk_score_enable_section';
import { ENTITY_ANALYTICS } from '../../app/translations';
import { RiskEnginePrivilegesCallOut } from '../components/risk_engine_privileges_callout';
import { useMissingRiskEnginePrivileges } from '../hooks/use_missing_risk_engine_privileges';
import { RiskScoreUsefulLinksSection } from '../components/risk_score_management/risk_score_useful_links_section';
import { RiskScoreConfigurationSection } from '../components/risk_score_management/risk_score_configuration_section';
import { useRiskEngineStatus } from '../api/hooks/use_risk_engine_status';
import { useScheduleNowRiskEngineMutation } from '../api/hooks/use_schedule_now_risk_engine_mutation';
import { useAppToasts } from '../../common/hooks/use_app_toasts';
import * as i18n from '../translations';
import { getEntityAnalyticsRiskScorePageStyles } from '../components/risk_score_management/risk_score_page_styles';
import { useConfigurableRiskEngineSettings } from '../components/risk_score_management/hooks/risk_score_configurable_risk_engine_settings_hooks';
import { RiskScoreSaveBar } from '../components/risk_score_management/risk_score_save_bar';
import { RiskScoreGeneralSection } from '../components/risk_score_management/risk_score_general_section';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { useKibana } from '../../common/lib/kibana';
import { AssetCriticalityFileUploader } from '../components/asset_criticality_file_uploader/asset_criticality_file_uploader';
import { useAssetCriticalityPrivileges } from '../components/asset_criticality/use_asset_criticality';
import { useHasSecurityCapability } from '../../helper_hooks';
import {
  useDeleteEntityEngineMutation,
  useEnableEntityStoreMutation,
  useEntityStoreStatus,
  useStopEntityEngineMutation,
} from '../components/entity_store/hooks/use_entity_store';
import { useEntityEnginePrivileges } from '../components/entity_store/hooks/use_entity_engine_privileges';
import { EntityStoreMissingPrivilegesCallout } from '../components/entity_store/components/entity_store_missing_privileges_callout';
import { EngineStatus } from '../components/entity_store/components/engines_status';
import { useEntityStoreTypes } from '../hooks/use_enabled_entity_types';
import { EntityStoreErrorCallout } from '../components/entity_store/components/entity_store_error_callout';

enum TabId {
  RiskScore = 'riskScore',
  Import = 'import',
  Status = 'status',
}

const TEN_SECONDS = 10000;

const isSwitchLoading = (status?: StoreStatus) => status === 'installing';
const isSwitchDisabled = (status?: StoreStatus) => status === 'error' || isSwitchLoading(status);
const isEntityStoreEnabled = (status?: StoreStatus) => status === 'running';
const canDeleteEntityEngine = (status?: StoreStatus) =>
  !['not_installed', 'installing'].includes(status || '');
const isEntityStoreInstalled = (status?: StoreStatus) => status && status !== 'not_installed';

const entityStoreLabel = i18nCore.translate(
  'xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.entityStoreLabel',
  { defaultMessage: 'Entity store' }
);

export const EntityAnalyticsManagementPage = () => {
  const { euiTheme } = useEuiTheme();
  const styles = getEntityAnalyticsRiskScorePageStyles(euiTheme);
  const modalTitleId = useGeneratedHtmlId();
  const riskEnginePrivileges = useMissingRiskEnginePrivileges();

  // Risk engine settings
  const {
    savedRiskEngineSettings,
    selectedRiskEngineSettings,
    selectedSettingsMatchSavedSettings,
    resetSelectedSettings,
    saveSelectedSettingsMutation,
    setSelectedDateSetting,
    toggleSelectedClosedAlertsSetting,
    isLoadingRiskEngineSettings,
    toggleScoreRetainment,
    setAlertFilters,
    getUIAlertFilters,
  } = useConfigurableRiskEngineSettings();

  const { data: riskEngineStatus } = useRiskEngineStatus({
    refetchInterval: TEN_SECONDS,
    structuralSharing: false,
  });
  const currentRiskEngineStatus = riskEngineStatus?.risk_engine_status;
  const runEngineEnabled = currentRiskEngineStatus === 'ENABLED';
  const [isLoadingRunRiskEngine, setIsLoadingRunRiskEngine] = useState(false);
  const { mutate: scheduleNowRiskEngine } = useScheduleNowRiskEngineMutation();
  const { addSuccess, addError } = useAppToasts();
  const userCanRunEngine =
    (!riskEnginePrivileges.isLoading &&
      (riskEnginePrivileges.hasAllRequiredPrivileges ||
        (!riskEnginePrivileges.hasAllRequiredPrivileges &&
          riskEnginePrivileges.missingPrivileges?.clusterPrivileges?.run?.length === 0))) ||
    false;
  const riskScoreResetToZeroIsEnabled = useIsExperimentalFeatureEnabled(
    'enableRiskScoreResetToZero'
  );

  const saveSettingsWrapperMutation = useMutation(async () => {
    if (selectedRiskEngineSettings) {
      await saveSelectedSettingsMutation.mutateAsync(selectedRiskEngineSettings);
    }
  });

  // Entity store state
  const hasEntityAnalyticsCapability = useHasSecurityCapability('entity-analytics');
  const isEntityStoreFeatureFlagDisabled = useIsExperimentalFeatureEnabled('entityStoreDisabled');
  const {
    data: assetCriticalityPrivileges,
    error: assetCriticalityPrivilegesError,
    isLoading: assetCriticalityIsLoading,
  } = useAssetCriticalityPrivileges('AssetCriticalityUploadPage');
  const hasAssetCriticalityWritePermissions = assetCriticalityPrivileges?.has_write_permissions;
  const entityStoreStatus = useEntityStoreStatus({});
  const entityTypes = useEntityStoreTypes();
  const enableStoreMutation = useEnableEntityStoreMutation();
  const stopEntityEngineMutation = useStopEntityEngineMutation(entityTypes);
  const deleteEntityEngineMutation = useDeleteEntityEngineMutation({
    onSuccess: () => {
      closeClearModal();
    },
    entityTypes,
  });

  const [isClearModalVisible, setIsClearModalVisible] = useState(false);
  const closeClearModal = useCallback(() => setIsClearModalVisible(false), []);
  const showClearModal = useCallback(() => setIsClearModalVisible(true), []);

  const onEntityStoreSwitchClick = useCallback(() => {
    if (isSwitchDisabled(entityStoreStatus.data?.status)) {
      return;
    }
    if (isEntityStoreEnabled(entityStoreStatus.data?.status)) {
      stopEntityEngineMutation.mutate();
    } else {
      enableStoreMutation.mutate({});
    }
  }, [entityStoreStatus.data?.status, stopEntityEngineMutation, enableStoreMutation]);

  const { data: entityEnginePrivileges } = useEntityEnginePrivileges();

  const shouldDisplayEngineStatusTab =
    isEntityStoreInstalled(entityStoreStatus.data?.status) &&
    entityEnginePrivileges?.has_all_required;

  // Tab state
  const [selectedTabId, setSelectedTabId] = useState(TabId.RiskScore);

  useEffect(() => {
    if (selectedTabId === TabId.Status && !shouldDisplayEngineStatusTab) {
      setSelectedTabId(TabId.RiskScore);
    }
  }, [shouldDisplayEngineStatusTab, selectedTabId]);

  // Run engine handler
  const handleRunEngineClick = async () => {
    setIsLoadingRunRiskEngine(true);
    try {
      scheduleNowRiskEngine();
      if (!isLoadingRunRiskEngine) {
        addSuccess(i18n.RISK_SCORE_ENGINE_RUN_SUCCESS, { toastLifeTimeMs: 5000 });
      }
    } catch (error) {
      addError(error, { title: i18n.RISK_SCORE_ENGINE_RUN_FAILURE });
    } finally {
      setIsLoadingRunRiskEngine(false);
    }
  };

  const { status, runAt } = riskEngineStatus?.risk_engine_task_status || {};
  const isRunning = status === 'running' || (!!runAt && new Date(runAt) < new Date());
  const runEngineBtnIsDisabled =
    !currentRiskEngineStatus || isLoadingRunRiskEngine || !userCanRunEngine || isRunning;

  const formatTimeFromNow = (time: string | undefined): string => {
    if (!time) {
      return '';
    }
    return i18n.RISK_ENGINE_NEXT_RUN_TIME(moment(time).fromNow(true));
  };

  const countDownText = isRunning
    ? 'Now running'
    : formatTimeFromNow(riskEngineStatus?.risk_engine_task_status?.runAt);

  const isEntityStoreMutationLoading =
    enableStoreMutation.isLoading ||
    stopEntityEngineMutation.isLoading ||
    deleteEntityEngineMutation.isLoading;

  const entityStoreCallouts = (entityStoreStatus.data?.engines || [])
    .filter((engine) => engine.status === 'error')
    .map((engine) => <EntityStoreErrorCallout key={engine.type} engine={engine} />);

  return (
    <>
      <RiskEnginePrivilegesCallOut privileges={riskEnginePrivileges} />
      <EuiPageHeader
        data-test-subj="entityAnalyticsManagementPage"
        pageTitle={
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem data-test-subj="entityAnalyticsManagementPageTitle" grow={false}>
              {ENTITY_ANALYTICS}
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiFlexGroup justifyContent="center" alignItems="center" gutterSize="m">
                {runEngineEnabled && (
                  <>
                    <EuiButton
                      size="s"
                      iconType="play"
                      disabled={runEngineBtnIsDisabled}
                      isLoading={isLoadingRunRiskEngine}
                      onClick={handleRunEngineClick}
                    >
                      {i18n.RUN_RISK_SCORE_ENGINE}
                    </EuiButton>
                    <styles.VerticalSeparator />
                    <div>
                      <EuiText size="s" color="subdued">
                        {countDownText}
                      </EuiText>
                    </div>
                  </>
                )}
                <RiskScoreEnableSection
                  selectedSettingsMatchSavedSettings={selectedSettingsMatchSavedSettings}
                  saveSelectedSettingsMutation={saveSettingsWrapperMutation}
                  privileges={riskEnginePrivileges}
                />
                {!isEntityStoreFeatureFlagDisabled && entityEnginePrivileges?.has_all_required && (
                  <>
                    <styles.VerticalSeparator />
                    <EnablementButton
                      isLoading={
                        isEntityStoreMutationLoading ||
                        isSwitchLoading(entityStoreStatus.data?.status)
                      }
                      isDisabled={isSwitchDisabled(entityStoreStatus.data?.status)}
                      onSwitch={onEntityStoreSwitchClick}
                      status={entityStoreStatus.data?.status}
                    />
                    {canDeleteEntityEngine(entityStoreStatus.data?.status) && (
                      <ClearEntityDataButton
                        deleteEntityEngineMutation={deleteEntityEngineMutation}
                        isClearModalVisible={isClearModalVisible}
                        closeClearModal={closeClearModal}
                        showClearModal={showClearModal}
                        modalTitleId={modalTitleId}
                      />
                    )}
                  </>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      />

      {isEntityStoreFeatureFlagDisabled && <EntityStoreFeatureFlagNotAvailableCallout />}
      {!entityEnginePrivileges || entityEnginePrivileges.has_all_required ? null : (
        <>
          <EuiSpacer size="l" />
          <EntityStoreMissingPrivilegesCallout privileges={entityEnginePrivileges} />
          <EuiSpacer size="l" />
        </>
      )}

      <EuiSpacer size="m" />

      <EuiTabs data-test-subj="entityAnalyticsManagementTabs">
        <EuiTab
          key={TabId.RiskScore}
          isSelected={selectedTabId === TabId.RiskScore}
          onClick={() => setSelectedTabId(TabId.RiskScore)}
          data-test-subj="riskScoreTab"
        >
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.riskScore.tabTitle"
            defaultMessage="Entity Risk Score"
          />
        </EuiTab>
        <EuiTab
          key={TabId.Import}
          isSelected={selectedTabId === TabId.Import}
          onClick={() => setSelectedTabId(TabId.Import)}
          data-test-subj="importEntitiesTab"
        >
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.importEntities.tabTitle"
            defaultMessage="Import Entities"
          />
        </EuiTab>
        {shouldDisplayEngineStatusTab && (
          <EuiTab
            key={TabId.Status}
            isSelected={selectedTabId === TabId.Status}
            onClick={() => setSelectedTabId(TabId.Status)}
            data-test-subj="engineStatusTab"
          >
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.engineStatus.tabTitle"
              defaultMessage="Engine Status"
            />
          </EuiTab>
        )}
      </EuiTabs>

      <EuiSpacer size="s" />

      {selectedTabId === TabId.RiskScore && (
        <>
          <EuiHorizontalRule />
          <EuiFlexGroup gutterSize="xl" alignItems="flexStart">
            {!selectedRiskEngineSettings && (
              <EuiFlexItem>
                <EuiLoadingSpinner size="m" />
                <EuiText size="s">
                  <p>{i18n.LOADING_RISK_ENGINE_SETTINGS}</p>
                </EuiText>
              </EuiFlexItem>
            )}
            {selectedRiskEngineSettings && (
              <>
                <EuiFlexItem grow={2}>
                  {riskScoreResetToZeroIsEnabled && (
                    <RiskScoreGeneralSection
                      riskEngineSettings={selectedRiskEngineSettings}
                      toggleScoreRetainment={toggleScoreRetainment}
                    />
                  )}
                  <RiskScoreConfigurationSection
                    selectedRiskEngineSettings={selectedRiskEngineSettings}
                    setSelectedDateSetting={setSelectedDateSetting}
                    toggleSelectedClosedAlertsSetting={toggleSelectedClosedAlertsSetting}
                    onAlertFiltersChange={setAlertFilters}
                    uiAlertFilters={getUIAlertFilters()}
                  />
                  <EuiHorizontalRule />
                  <RiskScoreUsefulLinksSection />
                </EuiFlexItem>
                <EuiFlexItem grow={2}>
                  <RiskScorePreviewSection
                    privileges={riskEnginePrivileges}
                    includeClosedAlerts={selectedRiskEngineSettings.includeClosedAlerts}
                    from={selectedRiskEngineSettings.range.start}
                    to={selectedRiskEngineSettings.range.end}
                    alertFilters={selectedRiskEngineSettings.filters}
                  />
                </EuiFlexItem>
              </>
            )}
          </EuiFlexGroup>
          {((savedRiskEngineSettings && !selectedSettingsMatchSavedSettings) ||
            (!savedRiskEngineSettings &&
              selectedRiskEngineSettings &&
              selectedRiskEngineSettings.filters &&
              selectedRiskEngineSettings.filters.length > 0)) && (
            <RiskScoreSaveBar
              resetSelectedSettings={resetSelectedSettings}
              saveSelectedSettings={() => {
                if (selectedRiskEngineSettings) {
                  saveSelectedSettingsMutation.mutateAsync(selectedRiskEngineSettings);
                }
              }}
              isLoading={isLoadingRiskEngineSettings || saveSelectedSettingsMutation.isLoading}
            />
          )}
        </>
      )}

      {selectedTabId === TabId.Import && (
        <EuiFlexGroup gutterSize="xl">
          <FileUploadSection
            assetCriticalityPrivilegesError={assetCriticalityPrivilegesError}
            hasEntityAnalyticsCapability={hasEntityAnalyticsCapability}
            hasAssetCriticalityWritePermissions={hasAssetCriticalityWritePermissions}
            isLoading={assetCriticalityIsLoading}
          />
          <EuiFlexItem grow={2}>
            <EuiFlexGroup direction="column">
              {enableStoreMutation.isError && (
                <EuiCallOut
                  announceOnMount
                  title={
                    <FormattedMessage
                      id="xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.errors.initErrorTitle"
                      defaultMessage="There was a problem initializing the entity store"
                    />
                  }
                  color="danger"
                  iconType="alert"
                >
                  <p>{(enableStoreMutation.error as { body: { message: string } }).body.message}</p>
                </EuiCallOut>
              )}
              {deleteEntityEngineMutation.isError && (
                <EuiCallOut
                  announceOnMount
                  title={
                    <FormattedMessage
                      id="xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.errors.deleteErrorTitle"
                      defaultMessage="There was a problem deleting the entity store"
                    />
                  }
                  color="danger"
                  iconType="alert"
                >
                  <p>
                    {
                      (deleteEntityEngineMutation.error as { body: { message: string } }).body
                        .message
                    }
                  </p>
                </EuiCallOut>
              )}
              {entityStoreCallouts}
              <WhatIsAssetCriticalityPanel />
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}

      {selectedTabId === TabId.Status && <EngineStatus />}
    </>
  );
};

EntityAnalyticsManagementPage.displayName = 'EntityAnalyticsManagementPage';

const EntityStoreHealth: React.FC<{ currentEntityStoreStatus?: StoreStatus }> = ({
  currentEntityStoreStatus,
}) => {
  return (
    <EuiHealth
      textSize="m"
      color={isEntityStoreEnabled(currentEntityStoreStatus) ? 'success' : 'subdued'}
    >
      {isEntityStoreEnabled(currentEntityStoreStatus) ? 'On' : 'Off'}
    </EuiHealth>
  );
};

const EnablementButton: React.FC<{
  isLoading: boolean;
  isDisabled: boolean;
  status?: StoreStatus;
  onSwitch: () => void;
}> = ({ isLoading, isDisabled, status, onSwitch }) => {
  return (
    <EuiFlexGroup alignItems="center">
      {isLoading && (
        <EuiFlexItem>
          <EuiLoadingSpinner data-test-subj="entity-store-status-loading" size="m" />
        </EuiFlexItem>
      )}
      <EntityStoreHealth currentEntityStoreStatus={status} />
      <EuiSwitch
        label={entityStoreLabel}
        onChange={onSwitch}
        data-test-subj="entity-store-switch"
        checked={isEntityStoreEnabled(status)}
        disabled={isDisabled}
        showLabel={false}
      />
    </EuiFlexGroup>
  );
};

const EntityStoreFeatureFlagNotAvailableCallout: React.FC = () => {
  return (
    <>
      <EuiSpacer size="m" />
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.featureFlagDisabled"
            defaultMessage="Entity Store capabilities not available"
          />
        }
        color="primary"
        iconType="info"
      >
        <EuiText size="s">
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.featureFlagDisabledDescription"
            defaultMessage="The full capabilities of the Entity Store have been disabled in this environment. Contact your administrator for further assistance."
          />
        </EuiText>
      </EuiCallOut>
    </>
  );
};

const ClearEntityDataButton: React.FC<{
  deleteEntityEngineMutation: ReturnType<typeof useDeleteEntityEngineMutation>;
  isClearModalVisible: boolean;
  closeClearModal: () => void;
  showClearModal: () => void;
  modalTitleId: string;
}> = ({
  deleteEntityEngineMutation,
  isClearModalVisible,
  closeClearModal,
  showClearModal,
  modalTitleId,
}) => {
  return (
    <>
      <EuiButtonEmpty
        color="danger"
        iconType="trash"
        onClick={() => {
          showClearModal();
        }}
      >
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.clear"
          defaultMessage="Clear Entity Data"
        />
      </EuiButtonEmpty>

      {isClearModalVisible && (
        <EuiConfirmModal
          isLoading={deleteEntityEngineMutation.isLoading}
          aria-labelledby={modalTitleId}
          title={
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.clearEntitiesModal.title"
              defaultMessage="Clear Entity data?"
            />
          }
          titleProps={{ id: modalTitleId }}
          onCancel={closeClearModal}
          onConfirm={() => {
            deleteEntityEngineMutation.mutate();
          }}
          cancelButtonText={
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.clearEntitiesModal.close"
              defaultMessage="Close"
            />
          }
          confirmButtonText={
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.clearEntitiesModal.clearAllEntities"
              defaultMessage="Clear All Entities"
            />
          }
          buttonColor="danger"
          defaultFocusedButton="confirm"
        >
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.clearConfirmation"
            defaultMessage="This will delete all Security Entity store records. Source data, Entity risk scores, and Asset criticality assignments are unaffected by this action. This operation cannot be undone."
          />
        </EuiConfirmModal>
      )}
    </>
  );
};

const WhatIsAssetCriticalityPanel: React.FC = () => {
  const { docLinks } = useKibana().services;
  const entityAnalyticsLinks = docLinks.links.securitySolution.entityAnalytics;

  return (
    <EuiPanel hasBorder={true} paddingSize="l" grow={false}>
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.assetCriticality.intro"
        defaultMessage="As part of importing entities using a text file, you are also able to set Asset Criticality for the imported Entities."
      />
      <EuiSpacer size="l" />
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiIcon type="question" size="xl" aria-hidden={true} />
        <EuiTitle size="xxs">
          <h3>
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.assetCriticality.title"
              defaultMessage="What is asset criticality?"
            />
          </h3>
        </EuiTitle>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiText size="s">
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.assetCriticality.description"
          defaultMessage="Asset criticality allows you to classify entities based on their importance and impact on business operations. Use asset criticality to guide prioritization for alert triaging, threat-hunting, and investigation activities."
        />
      </EuiText>
      <EuiHorizontalRule />
      <EuiTitle size="xxs">
        <h4>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.assetCriticality.usefulLinks"
            defaultMessage="Useful links"
          />
        </h4>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiLink
        target="_blank"
        rel="noopener nofollow noreferrer"
        href={entityAnalyticsLinks.assetCriticality}
      >
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.assetCriticality.documentationLink"
          defaultMessage="Asset criticality documentation"
        />
      </EuiLink>
    </EuiPanel>
  );
};

const InsufficientAssetCriticalityPrivilegesCallout: React.FC = () => {
  return (
    <EuiCallOut
      title={
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.assetCriticality.noPermissionTitle"
          defaultMessage="Insufficient index privileges to perform CSV upload"
        />
      }
      color="primary"
      iconType="info"
    >
      <EuiText size="s">
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.assetCriticality.missingPermissionsDescription"
          defaultMessage="Write permission is required for the {index} index pattern in order to access this functionality. Contact your administrator for further assistance."
          values={{
            index: <EuiCode>{ASSET_CRITICALITY_INDEX_PATTERN}</EuiCode>,
          }}
        />
      </EuiText>
    </EuiCallOut>
  );
};

const AssetCriticalityIssueCallout: React.FC<{ errorMessage?: string | ReactNode }> = ({
  errorMessage,
}) => {
  const msg = errorMessage ?? (
    <FormattedMessage
      id="xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.assetCriticality.advancedSettingDisabledMessage"
      defaultMessage="Privileges to access the Asset Criticality feature are missing for your user. Contact your administrator for further assistance."
    />
  );

  return (
    <EuiFlexItem grow={false}>
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.assetCriticality.unavailable"
            defaultMessage="Asset criticality CSV file upload functionality unavailable."
          />
        }
        color="primary"
        iconType="info"
      >
        <EuiText size="s">{msg}</EuiText>
      </EuiCallOut>
    </EuiFlexItem>
  );
};

const FileUploadSection: React.FC<{
  assetCriticalityPrivilegesError: SecurityAppError | null;
  hasEntityAnalyticsCapability: boolean;
  hasAssetCriticalityWritePermissions?: boolean;
  isLoading: boolean;
}> = ({
  assetCriticalityPrivilegesError,
  hasEntityAnalyticsCapability,
  hasAssetCriticalityWritePermissions,
  isLoading,
}) => {
  if (isLoading) {
    return null;
  }
  if (!hasEntityAnalyticsCapability || assetCriticalityPrivilegesError?.body.status_code === 403) {
    return (
      <AssetCriticalityIssueCallout errorMessage={assetCriticalityPrivilegesError?.body.message} />
    );
  }
  if (!hasAssetCriticalityWritePermissions) {
    return <InsufficientAssetCriticalityPrivilegesCallout />;
  }
  return (
    <EuiFlexItem grow={3}>
      <EuiSpacer size="m" />
      <EuiText size="s">
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.assetCriticality.uploadDescription"
          defaultMessage="Bulk assign asset criticality by importing a CSV, TXT, or TSV file exported from your asset management tools. This ensures data accuracy and reduces manual input errors."
        />
      </EuiText>
      <EuiSpacer size="s" />
      <AssetCriticalityFileUploader />
    </EuiFlexItem>
  );
};
