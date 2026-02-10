/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSkeletonText, EuiTitle, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useAttackDetailsContext } from '../../context';
import { useHeaderData } from '../../hooks/use_header_data';
import { useAttackEntitiesLists } from '../../hooks/use_attack_entities_lists';
import { UserDetails } from '../../../document_details/left/components/user_details';
import { HostDetails } from '../../../document_details/left/components/host_details';

const ATTACK_ENTITIES_DETAILS_TEST_ID = 'attack-entities-details';

/**
 * Entities (related users and hosts) displayed in the Attack Details expandable flyout left section
 * under the Insights tab. Uses all users and hosts from the alerts that are part of the attack.
 * Reuses the same UserDetails and HostDetails UI as the document details flyout.
 */
export const AttackEntitiesDetails: React.FC = memo(() => {
  const { scopeId } = useAttackDetailsContext();
  const { timestamp } = useHeaderData();
  const { userNames, hostNames, loading, error } = useAttackEntitiesLists();

  const timestampOrFallback = timestamp ?? '';

  if (loading) {
    return (
      <EuiSkeletonText lines={3} data-test-subj={`${ATTACK_ENTITIES_DETAILS_TEST_ID}-loading`} />
    );
  }

  if (error) {
    return (
      <FormattedMessage
        id="xpack.securitySolution.flyout.attackDetails.left.insights.entities.errorDescription"
        defaultMessage="Unable to load host and user information for this attack."
      />
    );
  }

  const hasEntities = userNames.length > 0 || hostNames.length > 0;

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
              id="xpack.securitySolution.flyout.left.insights.entities.userDetailsTitle"
              defaultMessage="User"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        {userNames.map((userName, index) => (
          <>
            <UserDetails
              key={`user-${index}-${userName}`}
              showTitle={false}
              userName={userName}
              timestamp={timestampOrFallback}
              scopeId={scopeId}
              expandedOnFirstRender={false}
            />
            <EuiSpacer size="s" />
          </>
        ))}
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="xpack.securitySolution.flyout.left.insights.entities.hostDetailsTitle"
              defaultMessage="Host"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        {hostNames.map((hostName, index) => (
          <>
            <HostDetails
              key={`hostName-${index}-${hostName}`}
              showTitle={false}
              hostName={hostName}
              timestamp={timestampOrFallback}
              scopeId={scopeId}
              expandedOnFirstRender={false}
            />
            <EuiSpacer size="s" />
          </>
        ))}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

AttackEntitiesDetails.displayName = 'AttackEntitiesDetails';
