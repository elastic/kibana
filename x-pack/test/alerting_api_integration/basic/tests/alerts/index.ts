/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function alertingTests({ loadTestFile }: FtrProviderContext) {
  describe('Alerts', () => {
    loadTestFile(require.resolve('./gold_noop_alert_type'));
    loadTestFile(require.resolve('./basic_noop_alert_type'));
  });
}
