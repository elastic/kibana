/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSearchAlertsQuery } from '@kbn/alerts-ui-shared/src/common/hooks/use_search_alerts_query';
import {
  OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES,
  observabilityAlertFeatureIds,
} from '../../../../common/constants';
import { AlertData } from '../../../hooks/use_fetch_alert_detail';
import { useKibana } from '../../../utils/kibana_react';
import { getBuildRelatedAlertsQuery } from './related_alerts/get_build_related_alerts_query';

export const useFindProximalAlerts = (alertDetail: AlertData) => {
  const { services } = useKibana();

  const esQuery = getBuildRelatedAlertsQuery({
    alert: alertDetail.formatted,
    filterProximal: true,
  });

  return useSearchAlertsQuery({
    data: services.data,
    ruleTypeIds: OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES,
    consumers: observabilityAlertFeatureIds,
    query: esQuery,
    skipAlertsQueryContext: true,
  });
};
