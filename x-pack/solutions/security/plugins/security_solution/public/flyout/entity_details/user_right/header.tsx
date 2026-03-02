/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import { max } from 'lodash/fp';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import type { ManagedUserData } from '../shared/hooks/use_managed_user';
import { ManagedUserDatasetKey } from '../../../../common/search_strategy/security_solution/users/managed_details';
import { getUsersDetailsUrl } from '../../../common/components/link_to/redirect_to_users';
import { SecuritySolutionLinkAnchor } from '../../../common/components/links';
import { PreferenceFormattedDate } from '../../../common/components/formatted_date';
import { FlyoutHeader } from '../../shared/components/flyout_header';
import { FlyoutTitle } from '../../shared/components/flyout_title';
import type { FirstLastSeenData } from '../shared/components/observed_entity/types';
import type { EntityIdentifiers } from '../../document_details/shared/utils';

interface UserPanelHeaderProps {
  entityIdentifiers: EntityIdentifiers;
  lastSeen: FirstLastSeenData;
  managedUser: ManagedUserData;
  userName: string;
}

const linkTitleCSS = { width: 'fit-content' };

const urlParamOverride = { timeline: { isOpen: false } };

export const UserPanelHeader = ({
  entityIdentifiers,
  lastSeen,
  managedUser,
  userName,
}: UserPanelHeaderProps) => {
  const displayName =
    userName ||
    entityIdentifiers['user.name'] ||
    (Object.values(entityIdentifiers)[0] as string) ||
    '';
  const oktaTimestamp = managedUser.data?.[ManagedUserDatasetKey.OKTA]?.fields?.[
    '@timestamp'
  ][0] as string | undefined;
  const entraTimestamp = managedUser.data?.[ManagedUserDatasetKey.ENTRA]?.fields?.[
    '@timestamp'
  ][0] as string | undefined;

  const isManaged = !!oktaTimestamp || !!entraTimestamp;
  const lastSeenDate = useMemo(
    () =>
      max([lastSeen.date, entraTimestamp, oktaTimestamp].map((el) => el && new Date(el))),
    [oktaTimestamp, entraTimestamp, lastSeen]
  );

  return (
    <FlyoutHeader data-test-subj="user-panel-header">
      <EuiFlexGroup gutterSize="s" responsive={false} direction="column">
        <EuiFlexItem grow={false}>
          <EuiText size="xs" data-test-subj={'user-panel-header-lastSeen'}>
            {lastSeenDate && <PreferenceFormattedDate value={lastSeenDate} />}
            <EuiSpacer size="xs" />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <SecuritySolutionLinkAnchor
            deepLinkId={SecurityPageName.users}
            path={getUsersDetailsUrl(displayName)}
            target={'_blank'}
            external={false}
            css={linkTitleCSS}
            override={urlParamOverride}
          >
            <FlyoutTitle title={displayName} iconType={'user'} isLink />
          </SecuritySolutionLinkAnchor>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              {lastSeen.date && (
                <EuiBadge data-test-subj="user-panel-header-observed-badge" color="hollow">
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.entityDetails.user.observedBadge"
                    defaultMessage="Observed"
                  />
                </EuiBadge>
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {isManaged && (
                <EuiBadge data-test-subj="user-panel-header-managed-badge" color="hollow">
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.entityDetails.user.managedBadge"
                    defaultMessage="Managed"
                  />
                </EuiBadge>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </FlyoutHeader>
  );
};
