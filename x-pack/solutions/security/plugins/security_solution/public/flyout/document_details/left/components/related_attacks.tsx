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
import { CorrelationsDetailsAlertsTable } from './correlations_details_alerts_table';
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
