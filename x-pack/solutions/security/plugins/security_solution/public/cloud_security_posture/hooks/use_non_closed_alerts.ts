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

export const useNonClosedAlerts = ({
  identityFields,
  to,
  from,
  queryId,
  additionalFilters,
  skip = false,
  entityType,
}: {
  identityFields: Record<string, string>;
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
  const { signalIndexName } = useSignalIndex();

  const { items: alertsData } = useAlertsByStatus({
    identityFields,
    entityType,
    signalIndexName,
    queryId,
    to,
    from,
    additionalFilters,
    skip,
  });

  const filteredAlertsData: ParsedAlertsData = alertsData
    ? Object.fromEntries(Object.entries(alertsData).filter(([key]) => key !== FILTER_CLOSED))
    : {};

  const hasNonClosedAlerts =
    (filteredAlertsData?.acknowledged?.total || 0) + (filteredAlertsData?.open?.total || 0) > 0;

  return { hasNonClosedAlerts, filteredAlertsData };
};
