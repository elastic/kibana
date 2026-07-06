/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { css } from '@emotion/react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSkeletonText,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { DocumentToolsFlyoutHeader } from '../../../shared/components/document_tools_flyout_header';
import { OpenFlyoutLink } from '../../../shared/components/open_flyout_link';
import {
  AttackHostInsightsRow,
  AttackUserInsightsRow,
} from '../../../../flyout/attack_details/left/components/attack_entity_insight_rows';
import { useAttackEntitiesLists } from './hooks/use_attack_entities_lists';
import {
  ATTACK_ENTITIES_TOOL_ERROR_TEST_ID,
  ATTACK_ENTITIES_TOOL_LOADING_TEST_ID,
  ATTACK_ENTITIES_TOOL_TEST_ID,
} from './test_ids';

const TITLE = i18n.translate('xpack.securitySolution.flyoutV2.attack.tools.entities.title', {
  defaultMessage: 'Entities',
});

export interface EntitiesDetailsProps {
  /**
   * The attack document hit. Used to derive the flyout header title and the timestamp
   * passed to the entity rows.
   */
  hit: DataTableRecord;
  /**
   * De-obfuscated IDs of all alerts underlying this attack, computed by useAttackAlertIds.
   */
  alertIds: string[];
}

/**
 * Attack Entities tool flyout panel.
 * Displays all deduped host and user entities aggregated across the attack's underlying alerts,
 * using the same entity rows as the legacy attack details left panel.
 */
export const EntitiesDetails = memo(({ hit, alertIds }: EntitiesDetailsProps) => {
  const { euiTheme } = useEuiTheme();
  const timestamp = String(hit.flattened?.['@timestamp'] ?? '');

  const { userEntityEntries, hostEntityEntries, loading, error } = useAttackEntitiesLists(alertIds);

  const hasEntities = userEntityEntries.length > 0 || hostEntityEntries.length > 0;

  // The reused legacy entity overview renders host.ip via the expandable-flyout `FlyoutLink`,
  // which has no rendered flyout to open into here. Supply a renderer that opens the network
  // flyout as a child through the new flyout system instead.
  const renderIpLink = useCallback(
    (ip: string) => <OpenFlyoutLink field="host.ip" value={ip} />,
    []
  );

  return (
    <>
      <EuiFlyoutHeader
        hasBorder
        css={css`
          padding-block: ${euiTheme.size.s} !important;
        `}
      >
        <DocumentToolsFlyoutHeader title={TITLE} hit={hit} />
      </EuiFlyoutHeader>
      <EuiFlyoutBody data-test-subj={ATTACK_ENTITIES_TOOL_TEST_ID}>
        {loading && (
          <EuiSkeletonText lines={3} data-test-subj={ATTACK_ENTITIES_TOOL_LOADING_TEST_ID} />
        )}
        {!loading && error && (
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.securitySolution.flyoutV2.attack.tools.entities.errorTitle"
                defaultMessage="Unable to load entities"
              />
            }
            color="danger"
            iconType="warning"
            data-test-subj={ATTACK_ENTITIES_TOOL_ERROR_TEST_ID}
          />
        )}
        {!loading && !error && !hasEntities && (
          <FormattedMessage
            id="xpack.securitySolution.flyoutV2.attack.tools.entities.noDataDescription"
            defaultMessage="Host and user information are unavailable for this attack."
          />
        )}
        {!loading && !error && hasEntities && (
          <EuiFlexGroup direction="column" gutterSize="m">
            {userEntityEntries.length > 0 && (
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h3>
                    <FormattedMessage
                      id="xpack.securitySolution.flyoutV2.attack.tools.entities.usersSectionTitle"
                      defaultMessage="{userCount, plural, one {User} other {Users}}:"
                      values={{ userCount: userEntityEntries.length }}
                    />
                  </h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                {userEntityEntries.map((entry, index) => (
                  <React.Fragment
                    key={`user-${index}-${
                      entry.identityFields['user.name'] ??
                      entry.identityFields['entity.id'] ??
                      index
                    }`}
                  >
                    {/* TODO: open host/user flyout when available (host/user flyout v2 is not merged yet) */}
                    <AttackUserInsightsRow
                      identityFields={entry.identityFields}
                      sampleSource={entry.sampleSource}
                      timestamp={timestamp}
                      scopeId=""
                      renderIpLink={renderIpLink}
                    />
                    <EuiSpacer size="s" />
                  </React.Fragment>
                ))}
              </EuiFlexItem>
            )}
            {hostEntityEntries.length > 0 && (
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h3>
                    <FormattedMessage
                      id="xpack.securitySolution.flyoutV2.attack.tools.entities.hostsSectionTitle"
                      defaultMessage="{hostCount, plural, one {Host} other {Hosts}}:"
                      values={{ hostCount: hostEntityEntries.length }}
                    />
                  </h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                {hostEntityEntries.map((entry, index) => (
                  <React.Fragment
                    key={`host-${index}-${
                      entry.identityFields['host.name'] ??
                      entry.identityFields['entity.id'] ??
                      index
                    }`}
                  >
                    {/* TODO: open host/user flyout when available (host/user flyout v2 is not merged yet) */}
                    <AttackHostInsightsRow
                      identityFields={entry.identityFields}
                      sampleSource={entry.sampleSource}
                      timestamp={timestamp}
                      scopeId=""
                      renderIpLink={renderIpLink}
                    />
                    <EuiSpacer size="s" />
                  </React.Fragment>
                ))}
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        )}
      </EuiFlyoutBody>
    </>
  );
});

EntitiesDetails.displayName = 'EntitiesDetails';
