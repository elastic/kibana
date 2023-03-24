/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile, getService }: FtrProviderContext) {
  const actions = getService('actions');
  const browser = getService('browser');
  const es = getService('es');
  const rules = getService('rules');
  const testIndex = `test-index`;

  describe('stack connectors', function () {
    before(async () => {
      await browser.setWindowSize(1920, 1080);
      await actions.api.createConnector({
        name: 'server-log-connector',
        config: {},
        secrets: {},
        connectorTypeId: '.server-log',
      });

      await es.indices.create({
        index: testIndex,
        body: {
          mappings: {
            properties: {
              date_updated: {
                type: 'date',
                format: 'epoch_millis',
              },
            },
          },
        },
      });
      await actions.api.createConnector({
        name: 'my-index-connector',
        config: {
          index: testIndex,
        },
        secrets: {},
        connectorTypeId: '.index',
      });
    });

    after(async () => {
      await rules.api.deleteAllRules();
      await actions.api.deleteAllConnectors();
      await es.indices.delete({ index: testIndex });
    });

    loadTestFile(require.resolve('./connectors'));
    loadTestFile(require.resolve('./connector_types'));
  });
}
