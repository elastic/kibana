/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';
import { getAvailableConnectors } from '../../common/connectors';

// eslint-disable-next-line import/no-default-export
export default function ({ loadTestFile, getService }: FtrProviderContext) {
  describe('Inference plugin - API integration tests', async () => {
    const currentConnector = getService('currentConnector');

    getAvailableConnectors().forEach((connector) => {
      describe(`Connector ${connector.id}`, () => {
        before(() => {
          currentConnector.set(connector.id);
        });

        loadTestFile(require.resolve('./chat_complete'));
      });
    });
  });
}
