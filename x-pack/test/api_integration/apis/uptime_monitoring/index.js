/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function ({ getService, loadTestFile }) {
  const es = getService('es');

  describe('uptime', () => {
    const cleanup = () => es.indices.delete({
      index: 'heartbeat',
      ignore: [404],
    });

    beforeEach(cleanup);

    loadTestFile(require.resolve('./get_all_pings'));
  });
}
