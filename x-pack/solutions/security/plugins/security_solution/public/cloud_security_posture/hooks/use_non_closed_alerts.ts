/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FILTER_CLOSED } from '@kbn/securitysolution-data-table/common/types';
import type { ESBoolQuery } from '../../../common/typed_json';
import { useSignalIndex } from '../../detections/containers/detection_engine/alerts/use_signal_index';
import { useAlertsByStatus } from '../../overview/components/detection_response/alerts_by_status/use_alerts_by_status';
import type { ParsedAlertsData } from '../../overview/components/detection_response/alerts_by_status/types';
import type { EntityStoreRecord } from '../../flyout/entity_details/shared/hooks/use_entity_from_store';
import {
  USE_FACELIFT_MOCK_FLYOUT,
  getFaceliftAlertsByStatus,
} from '../../entity_analytics/components/home/facelift/flyout_data';

export const useNonClosedAlerts = ({
  identityFields,
  to,
  from,
  queryId,
  additionalFilters,
  skip = false,
  entityType,
  entityRecord,
}: {
  identityFields: Record<string, string>;
  entityRecord?: EntityStoreRecord | null;
  to: string;
  from: string;
  queryId: string;
  additionalFilters?: ESBoolQuery[];
  skip?: boolean;
  /**
   * When Entity Store v2 is on and `identityFields` includes `entity.id`, required so alerts are
   * filtered using ECS terms resolved from the store (e.g. `user.name`), not a raw `entity.id` term.
   */
  entityType?: string;
}) => {
  const mockEntityId = entityRecord?.entity?.id ?? identityFields['entity.id'];
  const mockAlerts =
    USE_FACELIFT_MOCK_FLYOUT && !skip && mockEntityId
      ? getFaceliftAlertsByStatus(mockEntityId)
      : null;

  const { signalIndexName } = useSignalIndex();

  const { items: alertsData } = useAlertsByStatus({
    entityRecord,
    identityFields,
    entityType,
    signalIndexName,
    queryId,
    to,
    from,
    additionalFilters,
    skip: skip || Boolean(mockAlerts),
  });

  if (mockAlerts) {
    const filteredAlertsData = mockAlerts as ParsedAlertsData;
    return {
      hasNonClosedAlerts: true,
      filteredAlertsData,
    };
  }

  const filteredAlertsData: ParsedAlertsData = alertsData
    ? Object.fromEntries(Object.entries(alertsData).filter(([key]) => key !== FILTER_CLOSED))
    : {};

  const hasNonClosedAlerts =
    (filteredAlertsData?.acknowledged?.total || 0) + (filteredAlertsData?.open?.total || 0) > 0;

  return { hasNonClosedAlerts, filteredAlertsData };
};
