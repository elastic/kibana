/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import { max } from 'lodash/fp';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { ManagedUserDatasetKey } from '../../../../../common/search_strategy/security_solution/users/managed_details';
import { getTabsOnUsersDetailsUrl } from '../../../../common/components/link_to/redirect_to_users';
import { UsersTableType } from '../../../../explore/users/store/model';
import { SecuritySolutionLinkAnchor } from '../../../../common/components/links';
import { PreferenceFormattedDate } from '../../../../common/components/formatted_date';
import { FlyoutTitle } from '../../../shared/components/flyout_title';
import type { FirstLastSeenData } from '../../shared/components/observed_entity/types';
import type { ManagedUserData } from '../../../../flyout/entity_details/shared/hooks/use_managed_user';
import type { IdentityFields } from '../../../../flyout/document_details/shared/utils';
import type { RiskSeverity } from '../../../../../common/search_strategy';
import { EntitySourceBadge } from '../../../../flyout/entity_details/shared/components/entity_source_badge';
import { RiskLevelBadge } from '../../../../flyout/entity_details/shared/components/risk_level_badge';

export interface HeaderProps {
  /** User name displayed as the flyout title. */
  userName: string;
  /** Managed user data (Okta/Entra) used for the Managed badge. */
  managedUser: ManagedUserData;
  /** First/last seen timestamps for the user. */
  lastSeen: FirstLastSeenData;
  /** Entity store entity ID, used for the entity source badge. */
  entityId?: string;
  /** Key-value map of identity fields used to resolve the user. */
  identityFields?: IdentityFields;
  /** Whether the user exists in the entity store. */
  isEntityInStore?: boolean;
  /** Risk severity level for the user. */
  riskLevel?: RiskSeverity;
}

const linkTitleCSS = { width: 'fit-content' };
const urlParamOverride = { timeline: { isOpen: false } };

export const Header = ({
  userName,
  managedUser,
  lastSeen,
  entityId,
  identityFields,
  isEntityInStore,
  riskLevel,
}: HeaderProps) => {
  const oktaTimestamp = managedUser.data?.[ManagedUserDatasetKey.OKTA]?.fields?.[
    '@timestamp'
  ][0] as string | undefined;
  const entraTimestamp = managedUser.data?.[ManagedUserDatasetKey.ENTRA]?.fields?.[
    '@timestamp'
  ][0] as string | undefined;
  const observedUserLastSeenDate = lastSeen?.date;
  const isLoading = lastSeen?.isLoading ?? false;

  const isManaged = !!oktaTimestamp || !!entraTimestamp;
  const lastSeenDate = useMemo(
    () =>
      max(
        [observedUserLastSeenDate, entraTimestamp, oktaTimestamp].map((el) => el && new Date(el))
      ),
    [oktaTimestamp, entraTimestamp, observedUserLastSeenDate]
  );

  return (
    <div data-test-subj="user-panel-header">
      <EuiFlexGroup gutterSize="s" responsive={false} direction="column">
        {!isEntityInStore && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" data-test-subj={'user-panel-header-lastSeen'}>
              {isLoading ? (
                <EuiSkeletonText
                  lines={1}
                  size="xs"
                  data-test-subj="user-panel-header-lastSeen-loading"
                />
              ) : (
                lastSeenDate && <PreferenceFormattedDate value={lastSeenDate} />
              )}
              <EuiSpacer size="xs" />
            </EuiText>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiFlexGroup
            gutterSize="xs"
            responsive={false}
            direction="column"
            alignItems="flexStart"
          >
            <EuiFlexItem grow={false}>
              {isEntityInStore ? (
                <FlyoutTitle title={userName} iconType={'user'} />
              ) : (
                <SecuritySolutionLinkAnchor
                  deepLinkId={SecurityPageName.users}
                  path={getTabsOnUsersDetailsUrl(
                    userName,
                    UsersTableType.events,
                    undefined,
                    entityId,
                    identityFields && Object.keys(identityFields).length > 0
                      ? identityFields
                      : undefined
                  )}
                  target={'_blank'}
                  external={false}
                  css={linkTitleCSS}
                  override={urlParamOverride}
                >
                  <FlyoutTitle title={userName} iconType={'user'} isLink />
                </SecuritySolutionLinkAnchor>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {isLoading ? (
          <EuiFlexItem grow={true}>
            <EuiSkeletonText
              lines={1}
              size="xs"
              data-test-subj="user-panel-header-observed-badge-loading"
            />
          </EuiFlexItem>
        ) : (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiBadge data-test-subj="user-panel-header-entity-type-badge" color="hollow">
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.entityDetails.user.entityTypeBadge"
                    defaultMessage="User"
                  />
                </EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EntitySourceBadge
                  isEntityInStore={!!isEntityInStore}
                  hasLastSeenDate={!!observedUserLastSeenDate}
                  data-test-subj="user-panel-header-observed-badge"
                />
              </EuiFlexItem>
              {isManaged && (
                <EuiFlexItem grow={false}>
                  <EuiBadge data-test-subj="user-panel-header-managed-badge" color="hollow">
                    <FormattedMessage
                      id="xpack.securitySolution.flyout.entityDetails.user.managedBadge"
                      defaultMessage="Managed"
                    />
                  </EuiBadge>
                </EuiFlexItem>
              )}
              {isEntityInStore && riskLevel && (
                <EuiFlexItem grow={false}>
                  <RiskLevelBadge riskLevel={riskLevel} />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </div>
  );
};
