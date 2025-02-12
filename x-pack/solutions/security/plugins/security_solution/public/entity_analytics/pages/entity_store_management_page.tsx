/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiConfirmModal,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPageHeader,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiCallOut,
  EuiCode,
  EuiSwitch,
  EuiHealth,
  EuiLoadingSpinner,
  EuiTabs,
  EuiTab,
  EuiButtonEmpty,
} from '@elastic/eui';
import type { ReactNode } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import type { SecurityAppError } from '@kbn/securitysolution-t-grid';
import { i18n } from '@kbn/i18n';
import { type StoreStatus } from '../../../common/api/entity_analytics';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { ASSET_CRITICALITY_INDEX_PATTERN } from '../../../common/entity_analytics/asset_criticality';
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
import { MissingPrivilegesCallout } from '../components/entity_store/components/missing_privileges_callout';
import { EngineStatus } from '../components/entity_store/components/engines_status';
import { useStoreEntityTypes } from '../hooks/use_enabled_entity_types';

enum TabId {
  Import = 'import',
  Status = 'status',
}

const isSwitchLoading = (status?: StoreStatus) => status === 'installing';
const isSwitchDisabled = (status?: StoreStatus) => status === 'error' || isSwitchLoading(status);
const isEntityStoreEnabled = (status?: StoreStatus) => status === 'running';
const canDeleteEntityEngine = (status?: StoreStatus) =>
  !['not_installed', 'installing'].includes(status || '');
const isEntityStoreInstalled = (status?: StoreStatus) => status && status !== 'not_installed';

const entityStoreLabel = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityStoreManagementPage.title',
  {
    defaultMessage: 'Entity Store',
  }
);

export const EntityStoreManagementPage = () => {
  const hasEntityAnalyticsCapability = useHasSecurityCapability('entity-analytics');
  const isEntityStoreFeatureFlagDisabled = useIsExperimentalFeatureEnabled('entityStoreDisabled');
  const {
    data: assetCriticalityPrivileges,
    error: assetCriticalityPrivilegesError,
    isLoading: assetCriticalityIsLoading,
  } = useAssetCriticalityPrivileges('AssetCriticalityUploadPage');
  const hasAssetCriticalityWritePermissions = assetCriticalityPrivileges?.has_write_permissions;
  const [selectedTabId, setSelectedTabId] = useState(TabId.Import);
  const entityStoreStatus = useEntityStoreStatus({});
  const entityTypes = useStoreEntityTypes();
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

  const onSwitchClick = useCallback(() => {
    if (isSwitchDisabled(entityStoreStatus.data?.status)) {
      return;
    }

    if (isEntityStoreEnabled(entityStoreStatus.data?.status)) {
      stopEntityEngineMutation.mutate();
    } else {
      enableStoreMutation.mutate({});
    }
  }, [entityStoreStatus.data?.status, stopEntityEngineMutation, enableStoreMutation]);

  const { data: privileges } = useEntityEnginePrivileges();

  const shouldDisplayEngineStatusTab =
    isEntityStoreInstalled(entityStoreStatus.data?.status) && privileges?.has_all_required;

  useEffect(() => {
    if (selectedTabId === TabId.Status && !shouldDisplayEngineStatusTab) {
      setSelectedTabId(TabId.Import);
    }
  }, [shouldDisplayEngineStatusTab, selectedTabId]);

  if (assetCriticalityIsLoading) {
    // Wait for permission before rendering content to avoid flickering
    return null;
  }

  const isMutationLoading =
    enableStoreMutation.isLoading ||
    stopEntityEngineMutation.isLoading ||
    deleteEntityEngineMutation.isLoading;

  const callouts = (entityStoreStatus.data?.engines || [])
    .filter((engine) => engine.status === 'error')
    .map((engine) => {
      const err = engine.error as {
        message: string;
      };

      return (
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.entityStoreManagementPage.errors.title"
              defaultMessage={'An error occurred during entity store resource initialization'}
            />
          }
          color="danger"
          iconType="alert"
        >
          <p>{err?.message}</p>
        </EuiCallOut>
      );
    });

  return (
    <>
      <EuiPageHeader
        data-test-subj="entityStoreManagementPage"
        pageTitle={entityStoreLabel}
        alignItems="center"
        rightSideItems={
          !isEntityStoreFeatureFlagDisabled && privileges?.has_all_required
            ? [
                <EnablementButton
                  isLoading={isMutationLoading || isSwitchLoading(entityStoreStatus.data?.status)}
                  isDisabled={isSwitchDisabled(entityStoreStatus.data?.status)}
                  onSwitch={onSwitchClick}
                  status={entityStoreStatus.data?.status}
                />,
                canDeleteEntityEngine(entityStoreStatus.data?.status) ? (
                  <ClearEntityDataButton
                    {...{
                      deleteEntityEngineMutation,
                      isClearModalVisible,
                      closeClearModal,
                      showClearModal,
                    }}
                  />
                ) : null,
              ]
            : undefined
        }
      />
      <EuiSpacer size="s" />
      <EuiText>
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.entityStoreManagementPage.subTitle"
          defaultMessage="Store data for entities observed in events."
        />
      </EuiText>
      {isEntityStoreFeatureFlagDisabled && <EntityStoreFeatureFlagNotAvailableCallout />}
      {!privileges || privileges.has_all_required ? null : (
        <>
          <EuiSpacer size="l" />
          <MissingPrivilegesCallout privileges={privileges} />
          <EuiSpacer size="l" />
        </>
      )}

      <EuiSpacer size="m" />

      <EuiTabs data-test-subj="tabs">
        <EuiTab
          key={TabId.Import}
          isSelected={selectedTabId === TabId.Import}
          onClick={() => setSelectedTabId(TabId.Import)}
        >
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.entityStoreManagementPage.importEntities.tabTitle"
            defaultMessage="Import Entities"
          />
        </EuiTab>

        {shouldDisplayEngineStatusTab && (
          <EuiTab
            key={TabId.Status}
            isSelected={selectedTabId === TabId.Status}
            onClick={() => setSelectedTabId(TabId.Status)}
          >
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.entityStoreManagementPage.engineStatus.tabTitle"
              defaultMessage="Engine Status"
            />
          </EuiTab>
        )}
      </EuiTabs>

      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="xl">
        {selectedTabId === TabId.Import && (
          <FileUploadSection
            assetCriticalityPrivilegesError={assetCriticalityPrivilegesError}
            hasEntityAnalyticsCapability={hasEntityAnalyticsCapability}
            hasAssetCriticalityWritePermissions={hasAssetCriticalityWritePermissions}
          />
        )}
        {selectedTabId === TabId.Status && <EngineStatus />}
        <EuiFlexItem grow={2}>
          <EuiFlexGroup direction="column">
            {enableStoreMutation.isError && (
              <EuiCallOut
                title={
                  <FormattedMessage
                    id="xpack.securitySolution.entityAnalytics.entityStoreManagementPage.errors.initErrorTitle"
                    defaultMessage={'There was a problem initializing the entity store'}
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
                title={
                  <FormattedMessage
                    id="xpack.securitySolution.entityAnalytics.entityStoreManagementPage.errors.deleteErrorTitle"
                    defaultMessage={'There was a problem deleting the entity store'}
                  />
                }
                color="danger"
                iconType="alert"
              >
                <p>
                  {(deleteEntityEngineMutation.error as { body: { message: string } }).body.message}
                </p>
              </EuiCallOut>
            )}
            {callouts}
            {selectedTabId === TabId.Import && <WhatIsAssetCriticalityPanel />}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

EntityStoreManagementPage.displayName = 'EntityStoreManagementPage';

const WhatIsAssetCriticalityPanel: React.FC = () => {
  const { docLinks } = useKibana().services;
  const entityAnalyticsLinks = docLinks.links.securitySolution.entityAnalytics;

  return (
    <EuiPanel hasBorder={true} paddingSize="l" grow={false}>
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.information.intro"
        defaultMessage="As part of importing entities using a text file, you are also able to set Asset Criticality for the imported Entities."
      />
      <EuiSpacer size="l" />
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiIcon type="questionInCircle" size="xl" />
        <EuiTitle size="xxs">
          <h3>
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.information.title"
              defaultMessage="What is asset criticality?"
            />
          </h3>
        </EuiTitle>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiText size="s">
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.information.description"
          defaultMessage="Asset criticality allows you to classify entities based on their importance and impact on business operations. Use asset criticality to guide prioritization for alert triaging, threat-hunting, and investigation activities."
        />
      </EuiText>
      <EuiHorizontalRule />
      <EuiTitle size="xxs">
        <h4>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.information.usefulLinks"
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
          id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.documentationLink"
          defaultMessage="Asset criticality documentation"
        />
      </EuiLink>
    </EuiPanel>
  );
};

const EntityStoreFeatureFlagNotAvailableCallout: React.FC = () => {
  return (
    <>
      <EuiSpacer size="m" />
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.entityStoreManagementPage.featureFlagDisabled"
            defaultMessage="Entity Store capabilities not available"
          />
        }
        color="primary"
        iconType="iInCircle"
      >
        <EuiText size="s">
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.entityStoreManagementPage.featureFlagDisabledDescription"
            defaultMessage="The full capabilities of the Entity Store have been disabled in this environment. Contact your administrator for further assistance."
          />
        </EuiText>
      </EuiCallOut>
    </>
  );
};

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

const InsufficientAssetCriticalityPrivilegesCallout: React.FC = () => {
  return (
    <EuiCallOut
      title={
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.noPermissionTitle"
          defaultMessage="Insufficient index privileges to perform CSV upload"
        />
      }
      color="primary"
      iconType="iInCircle"
    >
      <EuiText size="s">
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.missingPermissionsCallout.description"
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
      id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.advancedSettingDisabledMessage"
      defaultMessage="Privileges to access the Asset Criticality feature are missing for your user. Contact your administrator for further assistance."
    />
  );

  return (
    <EuiFlexItem grow={false}>
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.unavailable"
            defaultMessage="Asset criticality CSV file upload functionality unavailable."
          />
        }
        color="primary"
        iconType="iInCircle"
      >
        <EuiText size="s">{msg}</EuiText>
      </EuiCallOut>
    </EuiFlexItem>
  );
};

const ClearEntityDataButton: React.FC<{
  deleteEntityEngineMutation: ReturnType<typeof useDeleteEntityEngineMutation>;
  isClearModalVisible: boolean;
  closeClearModal: () => void;
  showClearModal: () => void;
}> = ({ deleteEntityEngineMutation, isClearModalVisible, closeClearModal, showClearModal }) => {
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
          id="xpack.securitySolution.entityAnalytics.entityStoreManagementPage.clear"
          defaultMessage="Clear Entity Data"
        />
      </EuiButtonEmpty>

      {isClearModalVisible && (
        <EuiConfirmModal
          isLoading={deleteEntityEngineMutation.isLoading}
          title={
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.entityStoreManagementPage.clearEntitiesModal.title"
              defaultMessage="Clear Entity data?"
            />
          }
          onCancel={closeClearModal}
          onConfirm={() => {
            deleteEntityEngineMutation.mutate();
          }}
          cancelButtonText={
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.entityStoreManagementPage.clearEntitiesModal.close"
              defaultMessage="Close"
            />
          }
          confirmButtonText={
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.entityStoreManagementPage.clearEntitiesModal.clearAllEntities"
              defaultMessage="Clear All Entities"
            />
          }
          buttonColor="danger"
          defaultFocusedButton="confirm"
        >
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.entityStoreManagementPage.clearConfirmation"
            defaultMessage={
              'This will delete all Security Entity store records. Source data, Entity risk scores, and Asset criticality assignments are unaffected by this action. This operation cannot be undone.'
            }
          />
        </EuiConfirmModal>
      )}
    </>
  );
};

const FileUploadSection: React.FC<{
  assetCriticalityPrivilegesError: SecurityAppError | null;
  hasEntityAnalyticsCapability: boolean;
  hasAssetCriticalityWritePermissions?: boolean;
}> = ({
  assetCriticalityPrivilegesError,
  hasEntityAnalyticsCapability,
  hasAssetCriticalityWritePermissions,
}) => {
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
          id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.description"
          defaultMessage="Bulk assign asset criticality by importing a CSV, TXT, or TSV file exported from your asset management tools. This ensures data accuracy and reduces manual input errors."
        />
      </EuiText>
      <EuiSpacer size="s" />
      <AssetCriticalityFileUploader />
    </EuiFlexItem>
  );
};
