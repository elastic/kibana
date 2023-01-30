/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../common/ftr_provider_context';
// eslint-disable-next-line import/no-default-export
export default function alertingApiIntegrationTests({ loadTestFile }: FtrProviderContext) {
  describe('alerting api integration spaces only', function () {
    loadTestFile(require.resolve('./actions'));
    loadTestFile(require.resolve('./alerting'));
    loadTestFile(require.resolve('./action_task_params'));
  });
}
