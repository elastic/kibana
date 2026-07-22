/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { RowControlColumn, RowControlComponent } from '@kbn/discover-utils';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { useEntityStoreEuidApi } from '@kbn/entity-store/public';
import type { EntityType } from '../../../../../../common/entity_analytics/types';
import { EntityTypeToIdentifierField } from '../../../../../../common/entity_analytics/types';
import { createDataProviders } from '../../../../../app/actions/add_to_timeline/data_provider';
import { useInvestigateInTimeline } from '../../../../../common/hooks/timeline/use_investigate_in_timeline';
import { getEntityFields } from '../utils';
import { ENTITY_ANALYTICS_TABLE_ID } from '../constants';

const createEntityDataProviders = (
  entityType: EntityType | undefined,
  entityName: string | undefined,
  contextId: string
) => {
  if (!entityName || !entityType) return null;
  const fieldName: string = EntityTypeToIdentifierField[entityType] || 'entity.id';
  return createDataProviders({
    contextId,
    field: fieldName,
    values: entityName,
  });
};

const TIMELINE_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entitiesTable.investigateInTimeline',
  { defaultMessage: 'Investigate in Timeline' }
);

interface InvestigateInTimelineRowControlProps {
  Control: RowControlComponent;
  record: DataTableRecord;
  tableId: string;
}

/**
 * Owns `useInvestigateInTimeline` so the subscription to timeline-scoped data view
 * state stays on this leaf, not on `EntitiesDataTable`. Opening the timeline then
 * re-renders only this cheap control instead of the entities UnifiedDataTable.
 */
const InvestigateInTimelineRowControl = ({
  Control,
  record,
  tableId,
}: InvestigateInTimelineRowControlProps) => {
  const { investigateInTimeline } = useInvestigateInTimeline();
  const euidApi = useEntityStoreEuidApi();
  const { entityType, entityName } = getEntityFields(record);

  const onClick = useCallback(() => {
    if (!entityName || !entityType) {
      return;
    }

    const kqlFilter = euidApi?.euid.kql.getEuidFilterBasedOnDocument(entityType, record.raw);
    if (kqlFilter) {
      investigateInTimeline({ query: { query: kqlFilter, language: 'kuery' } });
      return;
    }

    const dataProviders = createEntityDataProviders(entityType, entityName, tableId);
    if (dataProviders?.length) {
      investigateInTimeline({ dataProviders });
    }
  }, [entityName, entityType, euidApi, record.raw, investigateInTimeline, tableId]);

  if (!entityName || !entityType) {
    return <Control iconType="timeline" label="" disabled onClick={undefined} />;
  }

  return (
    <Control
      iconType="timeline"
      label={TIMELINE_LABEL}
      color="text"
      onClick={onClick}
      data-test-subj="entity-analytics-home-timeline-icon"
    />
  );
};

interface UseLeadingControlColumnsArgs {
  canUseTimeline: boolean;
  /** Scopes "Investigate in Timeline" data providers; defaults to the EA home table id. */
  tableId?: string;
}

export const useLeadingControlColumns = ({
  canUseTimeline,
  tableId = ENTITY_ANALYTICS_TABLE_ID,
}: UseLeadingControlColumnsArgs): RowControlColumn[] => {
  return useMemo(() => {
    const columns: RowControlColumn[] = [];

    if (canUseTimeline) {
      columns.push({
        id: 'entity-analytics-timeline-action',
        // Widen the actions column so its "Actions" header renders as text rather than
        // collapsing to an info icon. UnifiedDataTable's ActionsHeader only shows the label
        // when the column is wider than the rendered word, and the default single-icon width
        // (24px) is too narrow.
        width: 48,
        render: (Control, { record }) => (
          <InvestigateInTimelineRowControl Control={Control} record={record} tableId={tableId} />
        ),
      });
    }

    return columns;
  }, [canUseTimeline, tableId]);
};
