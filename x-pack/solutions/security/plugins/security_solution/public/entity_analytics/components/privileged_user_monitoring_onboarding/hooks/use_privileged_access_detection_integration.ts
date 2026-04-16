/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useGetPackageInfoByKeyQuery } from '@kbn/fleet-plugin/public';
import type { GetInfoResponse } from '@kbn/fleet-plugin/common';

const isGetInfoResponse = (
  integration: GetInfoResponse | undefined
): integration is GetInfoResponse => integration !== undefined;

export const usePrivilegedAccessDetectionIntegration = () => {
  const { data: pad } = useGetPackageInfoByKeyQuery(
    'pad',
    undefined, // When package version is undefined it gets the latest version
    {
      prerelease: true, // This is a technical preview package, delete this line when it is GA:  https://github.com/elastic/security-team/issues/15167
    },
    {
      suspense: false,
    }
  );

  return isGetInfoResponse(pad) ? pad.item : undefined;
};
