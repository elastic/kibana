/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SyntheticsRestApiRouteFactory } from '../types';
import { SyntheticsServerSetup } from '../../types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';

export const installIndexTemplatesRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.INDEX_TEMPLATES,
  validate: {},
  handler: async ({ server }): Promise<any> => {
    return installSyntheticsIndexTemplates(server);
  },
});

export async function installSyntheticsIndexTemplates(server: SyntheticsServerSetup) {
  // no need to add error handling here since fleetSetupCompleted is already wrapped in try/catch and will log
  // warning if setup fails to complete
  await server.fleet.fleetSetupCompleted();

  const installation = await server.fleet.packageService.asInternalUser.ensureInstalledPackage({
    pkgName: 'synthetics',
  });

  if (!installation.package) {
    return Promise.reject('No package installation found.');
  }

  return installation.package;
}
