/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import {
  EuiCallOut,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SecurityAppError } from '@kbn/securitysolution-t-grid';

import { ASSET_CRITICALITY_INDEX_PATTERN } from '../../../../common/entity_analytics/asset_criticality';
import { AssetCriticalityFileUploader } from '../asset_criticality_file_uploader/asset_criticality_file_uploader';
import { useAssetCriticalityPrivileges } from './use_asset_criticality';
import { useHasSecurityCapability } from '../../../helper_hooks';
import { useKibana } from '../../../common/lib/kibana';
import {
  ASSET_CRITICALITY_ISSUE_CALLOUT_TEST_ID,
  ASSET_CRITICALITY_INSUFFICIENT_PRIVILEGES_TEST_ID,
  ASSET_CRITICALITY_FILE_UPLOAD_SECTION_TEST_ID,
  ASSET_CRITICALITY_INFO_PANEL_TEST_ID,
  ASSET_CRITICALITY_DOC_LINK_TEST_ID,
} from '../../test_ids';

export const AssetCriticalityTab = () => {
  const hasEntityAnalyticsCapability = useHasSecurityCapability('entity-analytics');
  const {
    data: assetCriticalityPrivileges,
    error: assetCriticalityPrivilegesError,
    isLoading: assetCriticalityIsLoading,
  } = useAssetCriticalityPrivileges('AssetCriticalityUploadPage');
  const hasAssetCriticalityWritePermissions = assetCriticalityPrivileges?.has_write_permissions;

  return (
    <EuiFlexGroup gutterSize="xl">
      <FileUploadSection
        assetCriticalityPrivilegesError={assetCriticalityPrivilegesError}
        hasEntityAnalyticsCapability={hasEntityAnalyticsCapability}
        hasAssetCriticalityWritePermissions={hasAssetCriticalityWritePermissions}
        isLoading={assetCriticalityIsLoading}
      />
      <EuiFlexItem grow={2}>
        <WhatIsAssetCriticalityPanel />
      </EuiFlexItem>
    </EuiFlexGroup>
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
    <EuiFlexItem grow={3} data-test-subj={ASSET_CRITICALITY_FILE_UPLOAD_SECTION_TEST_ID}>
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

const WhatIsAssetCriticalityPanel: React.FC = () => {
  const { docLinks } = useKibana().services;
  const entityAnalyticsLinks = docLinks.links.securitySolution.entityAnalytics;

  return (
    <EuiPanel
      hasBorder={true}
      paddingSize="l"
      grow={false}
      data-test-subj={ASSET_CRITICALITY_INFO_PANEL_TEST_ID}
    >
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
        data-test-subj={ASSET_CRITICALITY_DOC_LINK_TEST_ID}
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
      data-test-subj={ASSET_CRITICALITY_INSUFFICIENT_PRIVILEGES_TEST_ID}
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
        data-test-subj={ASSET_CRITICALITY_ISSUE_CALLOUT_TEST_ID}
      >
        <EuiText size="s">{msg}</EuiText>
      </EuiCallOut>
    </EuiFlexItem>
  );
};
