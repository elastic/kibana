/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { GetEntityStoreStatusResponse } from '@kbn/entity-store/common';
import { ENTITY_STORE_CONFIGURATION_TEST_ID } from '../../../../../test_ids';
import { NO_VALUE, formatDays, formatFrequency } from '../format';
import { EngineStatusBadge } from './engine_status_badge';

const NONE = i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.settings.none', {
  defaultMessage: 'None',
});

/** Read-only settings that are not per entity type: history snapshot and excluded user names. */
export const EntityStoreConfiguration = ({ data }: { data: GetEntityStoreStatusResponse }) => {
  const { historySnapshot, excludedUserNames = [] } = data;

  const settings = useMemo(
    () => [
      {
        title: i18n.translate(
          'xpack.securitySolution.entityAnalytics.entityStore.settings.config.snapshotStatus',
          { defaultMessage: 'History snapshot' }
        ),
        description: historySnapshot ? (
          <EngineStatusBadge status={historySnapshot.status} />
        ) : (
          NO_VALUE
        ),
      },
      {
        title: i18n.translate(
          'xpack.securitySolution.entityAnalytics.entityStore.settings.config.snapshotFrequency',
          { defaultMessage: 'Snapshot runs' }
        ),
        description: historySnapshot ? formatFrequency(historySnapshot.frequency) : NO_VALUE,
      },
      {
        title: i18n.translate(
          'xpack.securitySolution.entityAnalytics.entityStore.settings.config.snapshotRetention',
          { defaultMessage: 'Snapshots kept for' }
        ),
        description: historySnapshot ? formatDays(historySnapshot.retentionDays) : NO_VALUE,
      },
      {
        title: i18n.translate(
          'xpack.securitySolution.entityAnalytics.entityStore.settings.config.excludedUserNames',
          { defaultMessage: 'Excluded user names' }
        ),
        description:
          excludedUserNames.length > 0 ? (
            <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
              {excludedUserNames.map((name) => (
                <EuiFlexItem grow={false} key={name}>
                  <EuiBadge color="hollow">{name}</EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          ) : (
            NONE
          ),
      },
    ],
    [historySnapshot, excludedUserNames]
  );

  return (
    <EuiPanel hasBorder data-test-subj={ENTITY_STORE_CONFIGURATION_TEST_ID}>
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.entityStore.settings.config.title"
            defaultMessage="Other settings"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiDescriptionList type="column" columnWidths={[1, 2]} listItems={settings} />
    </EuiPanel>
  );
};
