/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../ftr_provider_context';

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
    async setup(archive: string) {
      await esArchiver.load(archive, { useCreate: true });
    },

    async tearDown(archives: string[] = []) {
      await Promise.all(archives.map((archive) => esArchiver.unload(archive)));
      await deleteDataStream('.monitoring-*');
    },
  };
};
