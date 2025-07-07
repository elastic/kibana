/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '@kbn/test-suites-xpack-platform/alerting_api_integration/common/ftr_provider_context';
import {
  buildUp,
  tearDown,
} from '@kbn/test-suites-xpack-platform/alerting_api_integration/spaces_only/tests/helpers';

export default function actionsTests({ loadTestFile, getService }: FtrProviderContext) {
  describe('Connectors with email services enabled Kibana config', () => {
    before(async () => buildUp(getService));
    after(async () => tearDown(getService));

    loadTestFile(require.resolve('./email'));
  });
}
