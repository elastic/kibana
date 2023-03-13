/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../api_integration/ftr_provider_context';

export const getLifecycleMethods = (getService: FtrProviderContext['getService']) => {
  const esArchiver = getService('esArchiver');
  const client = getService('es');

  const deleteDataStream = async (index: string) => {
    await client.transport.request(
      {
        method: 'DELETE',
        path: `_data_stream/${index}`,
      },
      {
        ignore: [404],
      }
    );
  };

  return {
    async setup(archives: string[] | string) {
      const archivesArray = Array.isArray(archives) ? archives : [archives];
      await Promise.all(archivesArray.map((archive) => esArchiver.load(archive)));
    },

    async tearDown() {
      // .monitoring-* and metrics-* mappings are already installed when we initiate
      // the tests suites. since the archiver doesn't have any reference to the
      // mappings it can't automatically delete it and we have to do the cleanup manually
      await deleteDataStream('.monitoring-*');
      await deleteDataStream('metrics-*.stack_monitoring.*');
    },
  };
};
