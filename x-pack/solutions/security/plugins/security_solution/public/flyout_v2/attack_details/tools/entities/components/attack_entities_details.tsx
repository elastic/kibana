/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSkeletonText, EuiTitle, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useAttackDetailsContext } from '../../../main/context';
import { useHeaderData } from '../../../../../flyout/attack_details/hooks/use_header_data';
import { useAttackEntitiesLists } from '../../../../../flyout/attack_details/hooks/use_attack_entities_lists';
import { UserDetails } from '../../../../../flyout/document_details/left/components/user_details';
import { HostDetails } from '../../../../../flyout/document_details/left/components/host_details';
import {
  ATTACK_ENTITIES_DETAILS_LOADING_TEST_ID,
  ATTACK_ENTITIES_DETAILS_TEST_ID,
} from '../../../main/constants/test_ids';

/**
 * Entities (related users and hosts) displayed in the v2 Attack Details
 * Entities child flyout. Mirrors the legacy
 * `flyout/attack_details/left/components/attack_entities_details.tsx`
 * content, reusing the same `UserDetails` / `HostDetails` presentation
 * components from the document_details flyout (per the spec exception for
 * presentation-shared components).
 */
export const AttackEntitiesDetails: React.FC = memo(() => {
  const { scopeId } = useAttackDetailsContext();
  const { timestamp } = useHeaderData();
  const { userEntityIdentifiers, hostEntityIdentifiers, loading, error } = useAttackEntitiesLists();

  const timestampOrFallback = timestamp ?? '';

  if (loading) {
    return <EuiSkeletonText lines={3} data-test-subj={ATTACK_ENTITIES_DETAILS_LOADING_TEST_ID} />;
  }

  if (error) {
    return (
      <FormattedMessage
        id="xpack.securitySolution.flyout.attackDetails.left.insights.entities.errorDescription"
        defaultMessage="Unable to load host and user information for this attack."
      />
    );
  }

  const hasEntities = userEntityIdentifiers.length > 0 || hostEntityIdentifiers.length > 0;

  if (!hasEntities) {
    return (
      <FormattedMessage
        id="xpack.securitySolution.flyout.attackDetails.left.insights.entities.noDataDescription"
        defaultMessage="Host and user information are unavailable for this attack."
      />
    );
  }

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="m"
      data-test-subj={ATTACK_ENTITIES_DETAILS_TEST_ID}
    >
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="xpack.securitySolution.flyout.attackDetails.left.insights.entities.userDetailsTitle"
              defaultMessage="{userCount, plural, one {User} other {Users}}:"
              values={{ userCount: userEntityIdentifiers.length }}
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        {userEntityIdentifiers.map((identifiers, index) => {
          const userName = identifiers['user.name'] ?? Object.values(identifiers)[0];
          return (
            <React.Fragment key={`user-${index}-${userName}`}>
              <UserDetails
                userName={userName}
                timestamp={timestampOrFallback}
                scopeId={scopeId}
                expandedOnFirstRender={false}
                isAttackDetails={true}
              />
              <EuiSpacer size="s" />
            </React.Fragment>
          );
        })}
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="xpack.securitySolution.flyout.attackDetails.left.insights.entities.hostDetailsTitle"
              defaultMessage="{hostCount, plural, one {Host} other {Hosts}}:"
              values={{ hostCount: hostEntityIdentifiers.length }}
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        {hostEntityIdentifiers.map((identifiers, index) => {
          const hostName = identifiers['host.name'] ?? Object.values(identifiers)[0];
          return (
            <React.Fragment key={`host-${index}-${hostName}`}>
              <HostDetails
                hostName={hostName}
                timestamp={timestampOrFallback}
                scopeId={scopeId}
                expandedOnFirstRender={false}
                isAttackDetails={true}
              />
              <EuiSpacer size="s" />
            </React.Fragment>
          );
        })}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

AttackEntitiesDetails.displayName = 'AttackEntitiesDetails';
