/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiButton,
  EuiMarkdownFormat,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../utils/kibana_react';
import { useAnnotationPermissions } from '../../components/annotations/hooks/use_annotation_permissions';

export function useAnnotationsPrivileges() {
  const { data: permissions, isLoading } = useAnnotationPermissions();

  if (permissions && !isLoading && !permissions?.read) {
    return (
      <EuiFlexGroup
        alignItems="center"
        justifyContent="center"
        style={{ height: 'calc(100vh - 150px)' }}
      >
        <EuiFlexItem grow={false}>
          <Unprivileged unprivilegedIndices={[permissions.index]} />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
  if (!isLoading && !permissions?.hasGoldLicense) {
    return (
      <EuiFlexGroup
        alignItems="center"
        justifyContent="center"
        style={{ height: 'calc(100vh - 150px)' }}
      >
        <EuiFlexItem grow={false}>
          <LicenseExpired />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return null;
}

function Unprivileged({ unprivilegedIndices }: { unprivilegedIndices: string[] }) {
  return (
    <EuiEmptyPrompt
      data-test-subj="syntheticsUnprivileged"
      color="plain"
      icon={<EuiIcon type="logoObservability" size="xl" />}
      title={
        <h2>
          <FormattedMessage
            id="xpack.observability.noFindingsStates.unprivileged.unprivilegedTitle"
            defaultMessage="Privileges required"
          />
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.observability.noFindingsStates.unprivileged.unprivilegedDescription"
            defaultMessage="To view Observability annotations data, you must update privileges. For more information, contact your Kibana administrator."
          />
        </p>
      }
      footer={
        <EuiMarkdownFormat
          css={css`
            text-align: initial;
          `}
          children={
            i18n.translate(
              'xpack.observability.noFindingsStates.unprivileged.unprivilegedFooterMarkdown',
              {
                defaultMessage:
                  'Required Elasticsearch index privilege `read` for the following indices:',
              }
            ) + unprivilegedIndices.map((idx) => `\n- \`${idx}\``)
          }
        />
      }
    />
  );
}

function LicenseExpired() {
  const licenseManagementEnabled = useKibana().services.licenseManagement?.enabled;

  const {
    http: { basePath },
  } = useKibana().services;

  return (
    <EuiEmptyPrompt
      data-test-subj="syntheticsUnprivileged"
      iconType="warning"
      iconColor="warning"
      title={
        <h2>
          <FormattedMessage
            id="xpack.observability.license.invalidLicenseTitle"
            defaultMessage="Invalid License"
          />
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.observability.license.invalidLicenseDescription"
            defaultMessage="You need a Gold license to view Observability annotations data. For more information, contact your Kibana administrator."
          />
        </p>
      }
      actions={[
        <EuiButton
          aria-label={i18n.translate('xpack.observability.invalidLicense.manageYourLicenseButton', {
            defaultMessage: 'Navigate to license management',
          })}
          data-test-subj="apmInvalidLicenseNotificationManageYourLicenseButton"
          isDisabled={!licenseManagementEnabled}
          href={basePath + '/app/management/stack/license_management'}
        >
          {i18n.translate('xpack.observability.invalidLicense.licenseManagementLink', {
            defaultMessage: 'Manage your license',
          })}
        </EuiButton>,
      ]}
    />
  );
}
