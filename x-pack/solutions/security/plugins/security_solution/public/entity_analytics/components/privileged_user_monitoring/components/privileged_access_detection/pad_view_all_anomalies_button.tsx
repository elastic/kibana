/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { ML_PAGES, useMlHref } from '@kbn/ml-plugin/public';
import { useKibana } from '../../../../../common/lib/kibana';
import { useGlobalTime } from '../../../../../common/containers/use_global_time';

const usePadMlAnomalyExplorerUrl = () => {
  const { from, to } = useGlobalTime();
  const { services } = useKibana();

  return useMlHref(
    services.ml,
    services.http.basePath.get(),
    {
      page: ML_PAGES.ANOMALY_EXPLORER,
      pageState: {
        jobIds: ['pad'],
        timeRange: { from, to },
        mlExplorerSwimlane: {
          viewByFieldName: 'user.name',
        },
      },
    },
    [from, to]
  );
};

export const PrivilegedAccessDetectionViewAllAnomaliesButton: React.FC = () => {
  const anomalyExplorerUrl = usePadMlAnomalyExplorerUrl();

  return (
    <EuiButton color={'primary'} fill={false} iconType={'anomalySwimLane'}>
      <EuiLink href={anomalyExplorerUrl} external={false} target="_blank">
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.privilegedAccessDetection.anomalyExplorer"
          defaultMessage="View all in Anomaly Explorer"
        />
      </EuiLink>
    </EuiButton>
  );
};
