/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSearchAlertsQuery } from '@kbn/alerts-ui-shared/src/common/hooks/use_search_alerts_query';
import { ALERT_UUID } from '@kbn/rule-data-utils';
import moment from 'moment';
import {
  OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES,
  observabilityAlertFeatureIds,
  PROXIMAL_DURATION_LOOKUP,
} from '../../../../common/constants';
import { AlertData } from '../../../hooks/use_fetch_alert_detail';
import { useKibana } from '../../../utils/kibana_react';

export const useFindProximalAlerts = (alertDetail: AlertData) => {
  const { services } = useKibana();

  const esQuery = {
    bool: {
      filter: [
        {
          range: {
            'kibana.alert.start': {
              gte: moment(alertDetail.formatted.start)
                .subtract(...PROXIMAL_DURATION_LOOKUP)
                .toISOString(),
              lte: moment(alertDetail.formatted.start)
                .add(...PROXIMAL_DURATION_LOOKUP)
                .toISOString(),
            },
          },
        },
      ],
      must_not: [
        {
          term: {
            [ALERT_UUID]: {
              value: alertDetail.formatted.fields[ALERT_UUID],
            },
          },
        },
      ],
    },
  };

  return useSearchAlertsQuery({
    data: services.data,
    ruleTypeIds: OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES,
    consumers: observabilityAlertFeatureIds,
    query: esQuery,
    useDefaultContext: true,
  });
};
