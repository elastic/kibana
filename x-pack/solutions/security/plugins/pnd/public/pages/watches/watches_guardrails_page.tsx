/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import {
  EuiBadge,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiText,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import type { Watch } from '@kbn/pnd-common';
import { PndPageSection } from '../../components/layout/pnd_page_section';
import { PndPageHeader } from '../../components/pnd_page_header';
import { usePndDocTitle } from '../../hooks/use_pnd_doc_title';
import { useWatches } from '../../hooks/use_watches_api';
import {
  WatchesSectionLayout,
  WatchesSubnavExpandControl,
} from './components/watches_section_layout';
import { AutonomyMeter } from './components/autonomy_meter';
import * as i18n from './translations';

const SCOPE_COLOR: Record<string, string> = {
  read: 'default',
  masked: 'warning',
  none: 'hollow',
};

/**
 * Aggregate "what is each Watch allowed to do" view — per-watch autonomy
 * level, how many of its capabilities are gated (require analyst
 * confirmation before acting), and its data scope boundaries. All three come
 * straight off the `Watch` object every other Watches page already fetches
 * via `useWatches()`; no new endpoint, no aggregation across separate
 * indices required (unlike Activity/Performance, which need the metrics
 * fix's investigation/proposal data).
 */
export const WatchesGuardrailsPage: React.FC = () => {
  usePndDocTitle(i18n.SUBNAV_GUARDRAILS);
  const history = useHistory();
  const { data, isLoading } = useWatches();

  const watches = data?.watches ?? [];

  const columns = useMemo<Array<EuiBasicTableColumn<Watch>>>(
    () => [
      {
        field: 'name',
        name: i18n.COL_NAME,
        render: (_value, watch: Watch) => (
          <EuiLink
            onClick={() => history.push(`/watches/${watch.id}`)}
            data-test-subj={`pndGuardrailsWatchLink-${watch.id}`}
          >
            <strong>{watch.name}</strong>
          </EuiLink>
        ),
      },
      {
        name: i18n.COL_AUTONOMY,
        render: (watch: Watch) => <AutonomyMeter level={watch.autonomyLevel} color={watch.color} />,
      },
      {
        name: i18n.COL_GATED_CAPABILITIES,
        render: (watch: Watch) => {
          const gated = watch.callables.filter((c) => c.gated).length;
          return gated > 0 ? (
            <EuiBadge color="warning">{gated}</EuiBadge>
          ) : (
            <EuiText size="s" color="subdued">
              —
            </EuiText>
          );
        },
      },
      {
        name: i18n.COL_DATA_SCOPE,
        render: (watch: Watch) => (
          <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
            {watch.scopes.map((scope) => (
              <EuiFlexItem grow={false} key={scope.name}>
                <EuiBadge color={SCOPE_COLOR[scope.access] ?? 'hollow'}>
                  {scope.name} — {scope.label}
                </EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        ),
      },
    ],
    [history]
  );

  return (
    <WatchesSectionLayout active="guardrails">
      <PndPageSection>
        <PndPageHeader
          title={i18n.SUBNAV_GUARDRAILS}
          subtitle={i18n.STUB_GUARDRAILS_SUBTITLE}
          leftSideItems={[<WatchesSubnavExpandControl key="subnav-expand" />]}
        />
        {isLoading ? (
          <EuiLoadingSpinner size="l" />
        ) : watches.length === 0 ? (
          <EuiText size="s" color="subdued">
            {i18n.GUARDRAILS_EMPTY_MESSAGE}
          </EuiText>
        ) : (
          <EuiBasicTable items={watches} columns={columns} tableLayout="auto" itemId="id" />
        )}
      </PndPageSection>
    </WatchesSectionLayout>
  );
};
