/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorAdapter } from '@kbn/alerting-plugin/server';
import { CoreSetup } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { FixtureStartDeps, FixtureSetupDeps } from './plugin';

export function defineConnectorAdapters(
  core: CoreSetup<FixtureStartDeps>,
  { alerting }: Pick<FixtureSetupDeps, 'alerting'>
) {
  const systemActionConnectorAdapter: ConnectorAdapter = {
    connectorTypeId: 'test.system-action-connector-adapter',
    ruleActionParamsSchema: schema.object({
      myParam: schema.string(),
      index: schema.maybe(schema.string()),
      reference: schema.maybe(schema.string()),
    }),
    /**
     * The connector adapter will inject a new param property which is required
     * by the action. The injected value cannot be set in the actions of the rule
     * as the schema validation will thrown an error. Only through the connector
     * adapter this value can be set. The tests are using the connector adapter test
     * that the new property is injected correctly
     */
    buildActionParams: ({ alerts, rule, params, spaceId, ruleUrl }) => {
      return { ...params, injected: 'param from connector adapter' };
    },
  };

  alerting.registerConnectorAdapter(systemActionConnectorAdapter);
}
