/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
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
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { DocumentToolsFlyoutHeader } from '../../../shared/components/document_tools_flyout_header';
import { OpenFlyoutLink } from '../../../shared/components/open_flyout_link';
import { useEntityFlyoutOverrides } from '../../../shared/hooks/use_entity_flyout_overrides';
import {
  AttackHostInsightsRow,
  AttackUserInsightsRow,
} from '../../../../flyout/attack_details/left/components/attack_entity_insight_rows';
import { useAttackEntitiesLists } from './hooks/use_attack_entities_lists';
import { usePersistedAttackEntities } from './hooks/use_persisted_attack_entities';
import { PersistedEntityRow } from './components/persisted_entity_row';
import { ObservableEntitiesList } from './components/observable_entities_list';
import {
  ATTACK_ENTITIES_TOOL_ERROR_TEST_ID,
  ATTACK_ENTITIES_TOOL_LOADING_TEST_ID,
  ATTACK_ENTITIES_TOOL_TEST_ID,
} from './test_ids';
import { ATTACK_ENTITIES_TITLE } from '../../../shared/constants/flyout_titles';

const EMPTY_ALERT_IDS: string[] = [];

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
 * When the document carries persisted entity-correlation fields
 * (`kibana.alert.attack_discovery.entities` / `...observable_entities`), renders entity rows
 * resolved from the Entity Store by EUID plus the unmatched observables. Otherwise falls back
 * to aggregating deduped host and user entities across the attack's underlying alerts, using
 * the same entity rows as the legacy attack details left panel.
 */
export const EntitiesDetails = memo(({ hit, alertIds }: EntitiesDetailsProps) => {
  const { euiTheme } = useEuiTheme();
  const timestamp = String(hit.flattened?.['@timestamp'] ?? '');

  // Documents generated after entity correlation carry pre-matched EUIDs (and unmatched
  // observables); when the entities field is present — even as an empty array — the persisted
  // data is authoritative and the aggregation fallback is skipped (empty alertIds skips the hook).
  const { persistedEntities, observableEntities } = usePersistedAttackEntities(hit);
  const hasPersistedEntities = persistedEntities !== undefined;

  const { userEntityEntries, hostEntityEntries, loading, error } = useAttackEntitiesLists(
    hasPersistedEntities ? EMPTY_ALERT_IDS : alertIds
  );

  const persistedUsers = useMemo(
    () => (persistedEntities ?? []).filter((entity) => entity.type === 'user'),
    [persistedEntities]
  );
  const persistedHosts = useMemo(
    () => (persistedEntities ?? []).filter((entity) => entity.type === 'host'),
    [persistedEntities]
  );
  const persistedServices = useMemo(
    () => (persistedEntities ?? []).filter((entity) => entity.type === 'service'),
    [persistedEntities]
  );

  const hasEntities = hasPersistedEntities
    ? persistedEntities.length > 0 || observableEntities.length > 0
    : userEntityEntries.length > 0 || hostEntityEntries.length > 0;
  const showLoading = !hasPersistedEntities && loading;
  const showError = !hasPersistedEntities && !loading && error;
  const showNoData = !showLoading && !showError && !hasEntities;

  const renderIpLink = useCallback(
    (ip: string) => <OpenFlyoutLink field="host.ip" value={ip} />,
    []
  );

  // The attack tool has no single representative document (it aggregates across many alerts),
  // so hit is omitted — openUserFlyoutAsChild / openHostFlyoutAsChild receive hit=undefined.
  const { buildUserOverrides, buildHostOverrides } = useEntityFlyoutOverrides({ scopeId: '' });

  return (
    <>
      <EuiFlyoutHeader
        hasBorder
        css={css`
          padding-block: ${euiTheme.size.s} !important;
        `}
      >
        <DocumentToolsFlyoutHeader title={ATTACK_ENTITIES_TITLE} hit={hit} />
      </EuiFlyoutHeader>
      <EuiFlyoutBody data-test-subj={ATTACK_ENTITIES_TOOL_TEST_ID}>
        {showLoading && (
          <EuiSkeletonText lines={3} data-test-subj={ATTACK_ENTITIES_TOOL_LOADING_TEST_ID} />
        )}
        {showError && (
          <EuiCallOut
            announceOnMount
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
        {showNoData && (
          <FormattedMessage
            id="xpack.securitySolution.flyoutV2.attack.tools.entities.noDataDescription"
            defaultMessage="Host and user information are unavailable for this attack."
          />
        )}
        {!showLoading && !showError && hasEntities && (
          <EuiFlexGroup direction="column" gutterSize="m">
            {persistedUsers.length > 0 && (
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h3>
                    <FormattedMessage
                      id="xpack.securitySolution.flyoutV2.attack.tools.entities.persistedUsersSectionTitle"
                      defaultMessage="{userCount, plural, one {User} other {Users}}:"
                      values={{ userCount: persistedUsers.length }}
                    />
                  </h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                {persistedUsers.map((entity) => (
                  <React.Fragment key={`persisted-user-${entity.id}`}>
                    <PersistedEntityRow
                      entityId={entity.id}
                      entityType="user"
                      timestamp={timestamp}
                      renderIpLink={renderIpLink}
                      buildEntityOverrides={buildUserOverrides}
                    />
                    <EuiSpacer size="s" />
                  </React.Fragment>
                ))}
              </EuiFlexItem>
            )}
            {persistedHosts.length > 0 && (
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h3>
                    <FormattedMessage
                      id="xpack.securitySolution.flyoutV2.attack.tools.entities.persistedHostsSectionTitle"
                      defaultMessage="{hostCount, plural, one {Host} other {Hosts}}:"
                      values={{ hostCount: persistedHosts.length }}
                    />
                  </h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                {persistedHosts.map((entity) => (
                  <React.Fragment key={`persisted-host-${entity.id}`}>
                    <PersistedEntityRow
                      entityId={entity.id}
                      entityType="host"
                      timestamp={timestamp}
                      renderIpLink={renderIpLink}
                      buildEntityOverrides={buildHostOverrides}
                    />
                    <EuiSpacer size="s" />
                  </React.Fragment>
                ))}
              </EuiFlexItem>
            )}
            {persistedServices.length > 0 && (
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h3>
                    <FormattedMessage
                      id="xpack.securitySolution.flyoutV2.attack.tools.entities.servicesSectionTitle"
                      defaultMessage="{serviceCount, plural, one {Service} other {Services}}:"
                      values={{ serviceCount: persistedServices.length }}
                    />
                  </h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                {persistedServices.map((entity) => (
                  <React.Fragment key={`persisted-service-${entity.id}`}>
                    <PersistedEntityRow
                      entityId={entity.id}
                      entityType="service"
                      timestamp={timestamp}
                    />
                    <EuiSpacer size="s" />
                  </React.Fragment>
                ))}
              </EuiFlexItem>
            )}
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
                    <AttackUserInsightsRow
                      identityFields={entry.identityFields}
                      sampleSource={entry.sampleSource}
                      timestamp={timestamp}
                      scopeId=""
                      renderIpLink={renderIpLink}
                      buildEntityOverrides={buildUserOverrides}
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
                    <AttackHostInsightsRow
                      identityFields={entry.identityFields}
                      sampleSource={entry.sampleSource}
                      timestamp={timestamp}
                      scopeId=""
                      renderIpLink={renderIpLink}
                      buildEntityOverrides={buildHostOverrides}
                    />
                    <EuiSpacer size="s" />
                  </React.Fragment>
                ))}
              </EuiFlexItem>
            )}
            <ObservableEntitiesList
              observableEntities={observableEntities}
              renderIpLink={renderIpLink}
            />
          </EuiFlexGroup>
        )}
      </EuiFlyoutBody>
    </>
  );
});

EntitiesDetails.displayName = 'EntitiesDetails';
