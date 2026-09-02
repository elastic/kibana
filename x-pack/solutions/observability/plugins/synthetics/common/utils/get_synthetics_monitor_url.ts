/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { stringify } from 'querystring';
import { CERTIFICATES_ROUTE, SYNTHETICS_APP_BASE_PATH } from '../constants/ui';

const format = ({ pathname, query }: { pathname: string; query: Record<string, any> }): string => {
  const queryString = stringify(query);
  return queryString ? `${pathname}?${queryString}` : pathname;
};
export const getSyntheticsErrorRouteFromMonitorId = ({
  configId,
  stateId,
  locationId,
}: {
  stateId: string;
  configId: string;
  locationId: string;
}) =>
  format({
    pathname: encodeURI(`/app/synthetics/monitor/${configId}/errors/${stateId}`),
    query: {
      locationId,
    },
  });

export const getSyntheticsCertificatesRoute = () =>
  `${SYNTHETICS_APP_BASE_PATH}${CERTIFICATES_ROUTE}`;
