/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';

import { EuiCallOut, EuiLink, useEuiTheme } from '@elastic/eui';
import { useSearchAlertsQuery } from '@kbn/alerts-ui-shared/src/common/hooks/use_search_alerts_query';
import moment from 'moment';
import { useKibana } from '../../utils/kibana_react';
import {
  OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES,
  observabilityAlertFeatureIds,
} from '../../../common/constants';
import { AlertData } from '../../hooks/use_fetch_alert_detail';

interface Props {
  alertDetail: AlertData;
}

export const ProximalAlertsCallout = ({ alertDetail }: Props) => {
  const { euiTheme } = useEuiTheme();
  const { services } = useKibana();

  const esQuery = {
    bool: {
      filter: [
        {
          range: {
            'kibana.alert.start': {
              gte: moment(alertDetail.formatted.start).subtract(30, 'minutes').toISOString(),
              lte: moment(alertDetail.formatted.start).add(30, 'minutes').toISOString(),
            },
          },
        },
      ],
    },
  };

  const { data, isError, isLoading } = useSearchAlertsQuery({
    data: services.data,
    ruleTypeIds: OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES,
    consumers: observabilityAlertFeatureIds,
    query: esQuery,
    useDefaultContext: true,
    pageSize: 100,
  });

  if (isLoading || isError || !data.querySnapshot?.response[0]) {
    return null;
  }

  const count = JSON.parse(data.querySnapshot.response[0]).hits.total;

  return (
    <EuiCallOut>
      {i18n.translate('xpack.observability.alertDetails.proximalAlert', {
        defaultMessage: '{count} alerts triggered around the same time',
        values: {
          count,
        },
      })}
      {count > 0 && <EuiLink css={{ marginLeft: euiTheme.size.s }}>See more</EuiLink>}
    </EuiCallOut>
  );
};
