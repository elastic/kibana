/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';

import type { DetonationSummary } from '../../../common/detonate';
import { FormattedRelativePreferenceDate } from '../../common/components/formatted_date';
import { SecuritySolutionLinkAnchor } from '../../common/components/links';
import { SecurityPageName } from '../../../common/constants';
import { useNavigateToDetonationAlerts } from '../hooks/use_navigate_to_detonation_alerts';
import { DetonationSeverityCell } from './detonation_severity';
import { FamilyBadges } from './family_badges';
import { ProtectionsBadges } from './protections_badges';
import {
  COLUMN_ALERTS,
  COLUMN_FAMILY,
  COLUMN_HASH,
  COLUMN_PLATFORM,
  COLUMN_PROTECTIONS,
  COLUMN_SEVERITY,
  COLUMN_SOURCE,
  COLUMN_TIMESTAMP,
  DETECTION_ALERTS_LABEL,
  ENDPOINT_ALERTS_LABEL,
  HASH_ALERTS_ACTION,
  HASH_LINK_TOOLTIP,
  NO_DETONATIONS,
  NO_DETONATIONS_BODY,
  TABLE_TITLE,
} from '../translations';

const SHORT_HASH_LENGTH = 12;

const AlertCounts: React.FC<{ detonation: DetonationSummary }> = ({ detonation }) => (
  <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
    {detonation.endpointAlertsCount > 0 && (
      <EuiFlexItem grow={false}>
        <EuiToolTip content={ENDPOINT_ALERTS_LABEL}>
          <EuiBadge color="danger" tabIndex={0}>
            {detonation.endpointAlertsCount}
          </EuiBadge>
        </EuiToolTip>
      </EuiFlexItem>
    )}
    {detonation.detectionAlertsCount > 0 && (
      <EuiFlexItem grow={false}>
        <EuiToolTip content={DETECTION_ALERTS_LABEL}>
          <EuiBadge color="warning" tabIndex={0}>
            {detonation.detectionAlertsCount}
          </EuiBadge>
        </EuiToolTip>
      </EuiFlexItem>
    )}
    {detonation.endpointAlertsCount === 0 && detonation.detectionAlertsCount === 0 && (
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued">
          {'0'}
        </EuiText>
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);

interface DetonationsTableProps {
  detonations: DetonationSummary[];
  isLoading: boolean;
}

const DetonationsTableComponent: React.FC<DetonationsTableProps> = ({ detonations, isLoading }) => {
  const { navigateToAlerts } = useNavigateToDetonationAlerts();

  const openAlertsForDetonation = useCallback(
    (detonation: DetonationSummary) =>
      navigateToAlerts({
        // The agent scopes the pivot to this one detonation. A sample detonated several times in
        // the same window would otherwise return all of those runs mixed together.
        agentId: detonation.agentId,
        sampleHash: detonation.sampleHash,
        timestamp: detonation.timestamp,
      }),
    [navigateToAlerts]
  );

  const columns = useMemo<Array<EuiBasicTableColumn<DetonationSummary>>>(
    () => [
      {
        field: 'timestamp',
        name: COLUMN_TIMESTAMP,
        width: '14%',
        sortable: true,
        render: (timestamp: string | null) =>
          timestamp ? <FormattedRelativePreferenceDate value={timestamp} /> : '—',
      },
      {
        field: 'sampleHash',
        name: COLUMN_HASH,
        width: '18%',
        render: (sampleHash: string | null, detonation: DetonationSummary) => {
          if (!sampleHash) {
            return <EuiText size="s">{'—'}</EuiText>;
          }
          return (
            <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiToolTip content={HASH_LINK_TOOLTIP}>
                  <SecuritySolutionLinkAnchor
                    deepLinkId={SecurityPageName.detonate}
                    path={`/${detonation.taskId}`}
                    data-test-subj="detonateHashLink"
                  >
                    <code>{sampleHash.slice(0, SHORT_HASH_LENGTH)}</code>
                    {detonation.sampleExtension ? ` .${detonation.sampleExtension}` : ''}
                  </SecuritySolutionLinkAnchor>
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip content={HASH_ALERTS_ACTION} disableScreenReaderOutput>
                  <EuiButtonIcon
                    iconType="maximize"
                    color="text"
                    aria-label={HASH_ALERTS_ACTION}
                    onClick={() => openAlertsForDetonation(detonation)}
                    data-test-subj="detonateAlertsAction"
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
      {
        field: 'families',
        name: COLUMN_FAMILY,
        width: '20%',
        render: (families: string[], detonation: DetonationSummary) => (
          <FamilyBadges families={families} categories={detonation.categories} />
        ),
      },
      {
        field: 'protections',
        name: COLUMN_PROTECTIONS,
        width: '18%',
        render: (_protections: DetonationSummary['protections'], detonation: DetonationSummary) => (
          <ProtectionsBadges protections={detonation.protections} />
        ),
      },
      {
        field: 'platform',
        name: COLUMN_PLATFORM,
        width: '10%',
        sortable: true,
      },
      {
        field: 'endpointAlertsCount',
        name: COLUMN_ALERTS,
        width: '8%',
        sortable: true,
        render: (_count: number, detonation: DetonationSummary) => (
          <AlertCounts detonation={detonation} />
        ),
      },
      {
        field: 'highestSeverity',
        name: COLUMN_SEVERITY,
        width: '8%',
        render: (severity: DetonationSummary['highestSeverity']) => (
          <DetonationSeverityCell severity={severity} />
        ),
      },
      {
        field: 'source',
        name: COLUMN_SOURCE,
        width: '10%',
        render: (source: string | null) =>
          source ? (
            <EuiBadge color="default">{source}</EuiBadge>
          ) : (
            <EuiText size="s" color="subdued">
              {'—'}
            </EuiText>
          ),
      },
    ],
    [openAlertsForDetonation]
  );

  return (
    <EuiInMemoryTable
      data-test-subj="detonationsTable"
      tableCaption={TABLE_TITLE}
      items={detonations}
      columns={columns}
      loading={isLoading}
      pagination={{ initialPageSize: 25, pageSizeOptions: [10, 25, 50] }}
      sorting={{ sort: { field: 'timestamp', direction: 'desc' } }}
      noItemsMessage={
        isLoading ? undefined : (
          <EuiEmptyPrompt
            iconType="magnify"
            title={<h3>{NO_DETONATIONS}</h3>}
            body={<p>{NO_DETONATIONS_BODY}</p>}
          />
        )
      }
    />
  );
};

export const DetonationsTable = React.memo(DetonationsTableComponent);
