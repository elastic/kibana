/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InheritedFtrProviderContext } from '../ftr_provider_context';

export async function getApmSynthtraceEsClient(context: InheritedFtrProviderContext) {
  const synthtraceClient = context.getService('synthtrace');

  const { apmEsClient } = await synthtraceClient.getClients(['apmEsClient']);

  await apmEsClient.initializePackage({ skipInstallation: false });

  return apmEsClient;
}
