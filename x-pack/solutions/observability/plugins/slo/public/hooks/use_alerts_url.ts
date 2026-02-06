/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { observabilityPaths } from '@kbn/observability-plugin/common';
import rison from '@kbn/rison';
import { useKibana } from './use_kibana';

export const useAlertsUrl = () => {
  const { basePath } = useKibana().services.http;

  return (opts?: {
    status?: 'active' | 'recovered';
    kuery?: string;
    rangeFrom?: string;
    rangeTo?: string;
  }) => {
    const { status, kuery, rangeFrom = 'now-24h', rangeTo = 'now' } = opts ?? {};

    return `${basePath.prepend(observabilityPaths.alerts)}?_a=${rison.encode({
      kuery,
      rangeFrom,
      rangeTo,
      status,
    })}`;
  };
};
