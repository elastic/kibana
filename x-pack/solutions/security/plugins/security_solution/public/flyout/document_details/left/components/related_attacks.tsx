/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { PageScope } from '../../../../data_view_manager/constants';
import { useDataView } from '../../../../data_view_manager/hooks/use_data_view';
import { AlertPreviewButton } from '../../../shared/components/alert_preview_button';
import {
  CorrelationsDetailsAlertsTable,
  type CorrelationsCustomTableColumn,
} from './correlations_details_alerts_table';
import { CORRELATIONS_DETAILS_RELATED_ATTACKS_SECTION_TEST_ID } from './test_ids';

export interface RelatedAttacksProps {
  /**
   * Value of the kibana.alert.attack_ids field
   */
  attackIds: string[];
  /**
   * Maintain backwards compatibility // TODO remove when possible
   */
  scopeId: string;
  /**
   * Id of the document
   */
  eventId: string;
}

/**
 * Show related attacks in an expandable panel with a table.
 */
export const RelatedAttacks: React.FC<RelatedAttacksProps> = ({ attackIds, scopeId, eventId }) => {
  const { dataView } = useDataView(PageScope.attacks);
  const attackIndexName = useMemo(() => dataView.getIndexPattern(), [dataView]);
  const columns = useMemo<Array<CorrelationsCustomTableColumn>>(
    () => [
      {
        render: (row: Record<string, unknown>) => (
          <AlertPreviewButton
            id={row.id as string}
            indexName={row.index as string}
            data-test-subj={`${CORRELATIONS_DETAILS_RELATED_ATTACKS_SECTION_TEST_ID}AlertPreviewButton`}
            scopeId={scopeId}
          />
        ),
        width: '5%',
      },
      {
        field: 'kibana.alert.attack_discovery.title',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.left.insights.correlations.relatedAttacksTitleColumnLabel"
            defaultMessage="Title"
          />
        ),
        truncateText: true,
        render: (value?: unknown) => String(value ?? ''),
      },
      {
        field: 'kibana.alert.workflow_status',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.left.insights.correlations.relatedAttacksStatusColumnLabel"
            defaultMessage="Status"
          />
        ),
        truncateText: true,
        width: '100px',
        render: (value?: unknown) => String(value ?? ''),
      },
      {
        field: 'kibana.alert.attack_discovery.alert_ids',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.left.insights.correlations.relatedAttacksAlertCountColumnLabel"
            defaultMessage="Alert count"
          />
        ),
        truncateText: true,
        preserveArray: true,
        width: '100px',
        render: (value: unknown) => (Array.isArray(value) ? value.length : ''),
      },
    ],
    [scopeId]
  );

  return (
    <CorrelationsDetailsAlertsTable
      title={
        <FormattedMessage
          id="xpack.securitySolution.flyout.left.insights.correlations.relatedAttacksTitle"
          defaultMessage="Related attacks ({count})"
          values={{ count: attackIds.length }}
        />
      }
      loading={false}
      alertIds={attackIds}
      scopeId={scopeId}
      eventId={eventId}
      indexName={attackIndexName}
      columns={columns}
      noItemsMessage={
        <FormattedMessage
          id="xpack.securitySolution.flyout.left.insights.correlations.relatedAttacksNoDataDescription"
          defaultMessage="No related attacks."
        />
      }
      data-test-subj={CORRELATIONS_DETAILS_RELATED_ATTACKS_SECTION_TEST_ID}
    />
  );
};

RelatedAttacks.displayName = 'RelatedAttacks';
