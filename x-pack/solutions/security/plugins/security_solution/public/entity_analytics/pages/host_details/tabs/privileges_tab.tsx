/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTitle,
  EuiBadge,
  EuiCallOut,
  EuiListGroup,
  EuiListGroupItem,
  EuiDescriptionList,
} from '@elastic/eui';

interface PrivilegesData {
  admin_count?: number;
  elevated_risk?: boolean;
  local_admins?: string[];
  root_users?: string[];
  ssh_keys_count?: number;
}

interface PrivilegesTabProps {
  hostId: string;
  privilegesData?: PrivilegesData;
}

const ADMIN_COUNT_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostDetails.privileges.adminCountLabel',
  {
    defaultMessage: 'Admin Accounts',
  }
);

const ELEVATED_RISK_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostDetails.privileges.elevatedRiskLabel',
  {
    defaultMessage: 'Elevated Risk',
  }
);

const SSH_KEYS_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostDetails.privileges.sshKeysLabel',
  {
    defaultMessage: 'SSH Keys',
  }
);

const LOCAL_ADMINS_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostDetails.privileges.localAdminsTitle',
  {
    defaultMessage: 'Local Administrators',
  }
);

const ROOT_USERS_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostDetails.privileges.rootUsersTitle',
  {
    defaultMessage: 'Root Users',
  }
);

const NO_PRIVILEGES_DATA = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostDetails.privileges.noData',
  {
    defaultMessage: 'No privileges data available for this host.',
  }
);

const NO_ADMINS_FOUND = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostDetails.privileges.noAdmins',
  {
    defaultMessage: 'No administrators found',
  }
);

const NO_ROOT_USERS_FOUND = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostDetails.privileges.noRootUsers',
  {
    defaultMessage: 'No root users found',
  }
);

const ELEVATED_RISK_WARNING_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostDetails.privileges.elevatedRiskWarningTitle',
  {
    defaultMessage: 'Elevated Privilege Risk Detected',
  }
);

const ELEVATED_RISK_WARNING_BODY = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostDetails.privileges.elevatedRiskWarningBody',
  {
    defaultMessage:
      'This host has been flagged as having elevated privilege risk. Review the privileged accounts and consider implementing additional security controls.',
  }
);

const YES_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostDetails.privileges.yesLabel',
  {
    defaultMessage: 'Yes',
  }
);

const NO_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostDetails.privileges.noLabel',
  {
    defaultMessage: 'No',
  }
);

const PRIVILEGES_SUMMARY_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostDetails.privileges.summaryTitle',
  {
    defaultMessage: 'Privileges Summary',
  }
);

// Helper to safely convert to number (ES may return string)
const toNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return toNumber(value[0]);
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
};

// Helper to safely convert to boolean (ES may return string "true"/"false")
const toBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return toBoolean(value[0]);
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true' || lower === '1') return true;
    if (lower === 'false' || lower === '0') return false;
  }
  if (typeof value === 'number') return value !== 0;
  return undefined;
};

export const PrivilegesTab: React.FC<PrivilegesTabProps> = React.memo(
  ({ hostId, privilegesData }) => {
    // Normalize values since ES returns strings
    const adminCount = useMemo(() => toNumber(privilegesData?.admin_count), [privilegesData?.admin_count]);
    const elevatedRisk = useMemo(() => toBoolean(privilegesData?.elevated_risk), [privilegesData?.elevated_risk]);
    const sshKeysCount = useMemo(() => toNumber(privilegesData?.ssh_keys_count), [privilegesData?.ssh_keys_count]);

    const summaryItems = useMemo(() => {
      if (!privilegesData) return [];
      return [
        {
          title: ADMIN_COUNT_LABEL,
          description: (
            <EuiBadge color={adminCount && adminCount > 0 ? 'warning' : 'default'}>
              {adminCount ?? 0}
            </EuiBadge>
          ),
        },
        {
          title: ELEVATED_RISK_LABEL,
          description: (
            <EuiBadge color={elevatedRisk === true ? 'danger' : 'success'}>
              {elevatedRisk === true ? YES_LABEL : NO_LABEL}
            </EuiBadge>
          ),
        },
        {
          title: SSH_KEYS_LABEL,
          description: String(sshKeysCount ?? 0),
        },
      ];
    }, [privilegesData, adminCount, elevatedRisk, sshKeysCount]);

    if (!privilegesData) {
      return (
        <>
          <EuiSpacer size="l" />
          <EuiCallOut title={NO_PRIVILEGES_DATA} color="warning" iconType="iInCircle" />
        </>
      );
    }

    return (
      <>
        <EuiSpacer size="l" />

        {elevatedRisk === true && (
          <>
            <EuiCallOut
              title={ELEVATED_RISK_WARNING_TITLE}
              color="danger"
              iconType="warning"
              size="s"
            >
              <p>{ELEVATED_RISK_WARNING_BODY}</p>
            </EuiCallOut>
            <EuiSpacer size="l" />
          </>
        )}

        <EuiFlexGroup gutterSize="l" wrap>
          <EuiFlexItem grow={1} style={{ minWidth: '300px' }}>
            <EuiPanel>
              <EuiTitle size="xs">
                <h3>{PRIVILEGES_SUMMARY_TITLE}</h3>
              </EuiTitle>
              <EuiSpacer size="m" />
              <EuiDescriptionList
                type="column"
                listItems={summaryItems}
                compressed
                columnWidths={[1, 1]}
              />
            </EuiPanel>
          </EuiFlexItem>

          <EuiFlexItem grow={1} style={{ minWidth: '300px' }}>
            <EuiPanel>
              <EuiTitle size="xs">
                <h3>{LOCAL_ADMINS_TITLE}</h3>
              </EuiTitle>
              <EuiSpacer size="m" />
              {privilegesData.local_admins && privilegesData.local_admins.length > 0 ? (
                <EuiListGroup flush>
                  {privilegesData.local_admins.map((admin, index) => (
                    <EuiListGroupItem
                      key={index}
                      label={admin}
                      iconType="user"
                      size="s"
                      wrapText
                    />
                  ))}
                </EuiListGroup>
              ) : (
                <EuiText size="s" color="subdued">
                  {NO_ADMINS_FOUND}
                </EuiText>
              )}
            </EuiPanel>
          </EuiFlexItem>

          {privilegesData.root_users && privilegesData.root_users.length > 0 && (
            <EuiFlexItem grow={1} style={{ minWidth: '300px' }}>
              <EuiPanel>
                <EuiTitle size="xs">
                  <h3>{ROOT_USERS_TITLE}</h3>
                </EuiTitle>
                <EuiSpacer size="m" />
                <EuiListGroup flush>
                  {privilegesData.root_users.map((user, index) => (
                    <EuiListGroupItem
                      key={index}
                      label={user}
                      iconType="userAvatar"
                      size="s"
                      wrapText
                    />
                  ))}
                </EuiListGroup>
              </EuiPanel>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </>
    );
  }
);

PrivilegesTab.displayName = 'PrivilegesTab';
