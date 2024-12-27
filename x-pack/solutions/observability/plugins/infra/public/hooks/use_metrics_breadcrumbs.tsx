/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChromeBreadcrumb } from '@kbn/core/public';
import { useBreadcrumbs, useLinkProps } from '@kbn/observability-shared-plugin/public';
import { METRICS_APP } from '../../common/constants';
import { metricsTitle } from '../translations';
import { useKibanaContextForPlugin } from './use_kibana';

export const useMetricsBreadcrumbs = (extraCrumbs: ChromeBreadcrumb[]) => {
  const {
    services: { serverless },
  } = useKibanaContextForPlugin();
  const appLinkProps = useLinkProps({ app: METRICS_APP });

  const breadcrumbs = [
    {
      ...appLinkProps,
      text: metricsTitle,
    },
    ...extraCrumbs,
  ];

  useBreadcrumbs(breadcrumbs, { serverless });
};
