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
import { useOriginalAlertIds } from '../../hooks/use_original_alert_ids';
import { useAttackEntitiesLists } from '../../../../flyout_v2/attack/tools/entities/hooks/use_attack_entities_lists';
import { AttackHostInsightsRow, AttackUserInsightsRow } from './attack_entity_insight_rows';

const ATTACK_ENTITIES_DETAILS_TEST_ID = 'attack-entities-details';

/**
 * Entities (related users and hosts) displayed in the Attack Details expandable flyout left section
 * under the Insights tab. Uses all users and hosts from the alerts that are part of the attack.
 * Reuses the same UserDetails and HostDetails UI as the document details flyout.
 */
export const AttackEntitiesDetails: React.FC = memo(() => {
  const { scopeId } = useAttackDetailsContext();
  const { timestamp } = useHeaderData();
  const originalAlertIds = useOriginalAlertIds();
  const { userEntityEntries, hostEntityEntries, loading, error } =
    useAttackEntitiesLists(originalAlertIds);

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

  const hasEntities = userEntityEntries.length > 0 || hostEntityEntries.length > 0;

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
              values={{ userCount: userEntityEntries.length }}
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        {userEntityEntries.map((entry, index) => (
          <React.Fragment
            key={`user-${index}-${
              entry.identityFields['user.name'] ?? entry.identityFields['entity.id'] ?? index
            }`}
          >
            <AttackUserInsightsRow
              identityFields={entry.identityFields}
              sampleSource={entry.sampleSource}
              timestamp={timestampOrFallback}
              scopeId={scopeId}
            />
            <EuiSpacer size="s" />
          </React.Fragment>
        ))}
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="xpack.securitySolution.flyout.attackDetails.left.insights.entities.hostDetailsTitle"
              defaultMessage="{hostCount, plural, one {Host} other {Hosts}}:"
              values={{ hostCount: hostEntityEntries.length }}
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        {hostEntityEntries.map((entry, index) => (
          <React.Fragment
            key={`host-${index}-${
              entry.identityFields['host.name'] ?? entry.identityFields['entity.id'] ?? index
            }`}
          >
            <AttackHostInsightsRow
              identityFields={entry.identityFields}
              sampleSource={entry.sampleSource}
              timestamp={timestampOrFallback}
              scopeId={scopeId}
            />
            <EuiSpacer size="s" />
          </React.Fragment>
        ))}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

AttackEntitiesDetails.displayName = 'AttackEntitiesDetails';
