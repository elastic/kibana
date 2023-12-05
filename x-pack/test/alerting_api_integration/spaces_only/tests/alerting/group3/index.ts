/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { buildUp, tearDown } from '../../helpers';

// eslint-disable-next-line import/no-default-export
export default function alertingTests({ loadTestFile, getService }: FtrProviderContext) {
  describe('Alerting', () => {
    before(async () => await buildUp(getService));
    after(async () => await tearDown(getService));

    loadTestFile(require.resolve('./builtin_alert_types'));
    loadTestFile(require.resolve('./maintenance_window_flows'));
    loadTestFile(require.resolve('./maintenance_window_scoped_query'));
  });
}
