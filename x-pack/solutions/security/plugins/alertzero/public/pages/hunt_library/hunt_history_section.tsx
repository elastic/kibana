/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { FormattedDate, FormattedRelative } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ALERTZERO_APP_ID } from '../../../common/constants';
import { SELECTED_CONVERSATION_ID_PARAM } from '../conversations/conversations_url_params';
import type { HuntHistoryEntry } from '../../../common/hunt_library';
import { useHuntHistory } from '../../hooks/use_hunt_library_api';
import * as i18n from './translations';

const OUTCOME_LABELS: Record<string, string> = {
  exploratory: i18n.HISTORY_OUTCOME_EXPLORATORY,
  investigation_created: i18n.HISTORY_OUTCOME_INVESTIGATION_CREATED,
  pending_handoff: i18n.HISTORY_OUTCOME_SAVING,
  handoff_failed: i18n.HISTORY_OUTCOME_SAVE_FAILED,
  handoff_cleanup_required: i18n.HISTORY_OUTCOME_NEEDS_CLEANUP,
  handoff_cleanup_exhausted: i18n.HISTORY_OUTCOME_NEEDS_CLEANUP,
};

const getColumns = (
  getInvestigationUrl: (investigationId: string) => string
): Array<EuiBasicTableColumn<HuntHistoryEntry>> => [
  {
    field: 'startedAt',
    name: i18n.HISTORY_COLUMN_STARTED,
    render: (startedAt: string) => (
      <EuiToolTip content={<FormattedDate value={startedAt} dateStyle="long" timeStyle="medium" />}>
        <FormattedRelative value={startedAt} />
      </EuiToolTip>
    ),
  },
  {
    field: 'startedBy',
    name: i18n.HISTORY_COLUMN_BY,
    render: (startedBy?: string) => startedBy ?? '-',
  },
  {
    field: 'kind',
    name: i18n.HISTORY_COLUMN_TYPE,
    render: () => i18n.HISTORY_TYPE_MANUAL,
  },
  {
    field: 'outcome',
    name: i18n.HISTORY_COLUMN_OUTCOME,
    render: (outcome: string, { investigationId }: HuntHistoryEntry) => (
      <EuiFlexGroup direction="column" gutterSize="xs" alignItems="flexStart">
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{OUTCOME_LABELS[outcome] ?? outcome}</EuiBadge>
        </EuiFlexItem>
        {investigationId && (
          <EuiFlexItem grow={false}>
            <EuiLink
              href={getInvestigationUrl(investigationId)}
              target="_blank"
              external
              data-test-subj="alertZeroHuntHistoryInvestigationLink"
            >
              {i18n.HISTORY_VIEW_INVESTIGATION}
            </EuiLink>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    ),
  },
];

/** A hunt's recent manual sessions in this space, one row per session. */
export const HuntHistorySection: React.FC<{ huntId: string }> = ({ huntId }) => {
  const { data, isLoading, isError, refetch } = useHuntHistory(huntId);
  const {
    services: { application },
  } = useKibana<CoreStart>();
  const columns = useMemo(
    () =>
      getColumns((investigationId) =>
        application.getUrlForApp(ALERTZERO_APP_ID, {
          path: `?${SELECTED_CONVERSATION_ID_PARAM}=${encodeURIComponent(investigationId)}`,
          absolute: true,
        })
      ),
    [application]
  );

  return (
    <div data-test-subj="alertZeroHuntFlyoutHistory">
      <EuiTitle size="xxs">
        <h4>{i18n.HISTORY_TITLE}</h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      {isLoading ? (
        <EuiLoadingSpinner size="m" aria-label={i18n.FLYOUT_LOADING} />
      ) : isError || !data ? (
        <EuiText size="s" color="danger" data-test-subj="alertZeroHuntFlyoutHistoryError">
          <p>
            {i18n.HISTORY_ERROR}{' '}
            <EuiButtonEmpty
              size="xs"
              onClick={() => refetch()}
              data-test-subj="alertZeroHuntFlyoutHistoryRetry"
            >
              {i18n.RETRY}
            </EuiButtonEmpty>
          </p>
        </EuiText>
      ) : data.history.length === 0 ? (
        <EuiText size="s" color="subdued" data-test-subj="alertZeroHuntFlyoutHistoryEmpty">
          <p>{i18n.HISTORY_EMPTY}</p>
        </EuiText>
      ) : (
        <EuiBasicTable
          tableCaption={i18n.HISTORY_CAPTION}
          items={data.history}
          itemId="sessionId"
          columns={columns}
          data-test-subj="alertZeroHuntFlyoutHistoryTable"
        />
      )}
    </div>
  );
};
