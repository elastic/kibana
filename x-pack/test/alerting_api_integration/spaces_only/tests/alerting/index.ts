/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function alertingTests({ loadTestFile }: FtrProviderContext) {
  describe('Alerting', () => {
    loadTestFile(require.resolve('./create'));
    loadTestFile(require.resolve('./delete'));
    loadTestFile(require.resolve('./disable'));
    loadTestFile(require.resolve('./enable'));
    loadTestFile(require.resolve('./find'));
    loadTestFile(require.resolve('./get'));
    loadTestFile(require.resolve('./get_alert_state'));
    loadTestFile(require.resolve('./list_alert_types'));
    loadTestFile(require.resolve('./mute_all'));
    loadTestFile(require.resolve('./mute_instance'));
    loadTestFile(require.resolve('./unmute_all'));
    loadTestFile(require.resolve('./unmute_instance'));
    loadTestFile(require.resolve('./update'));
    loadTestFile(require.resolve('./update_api_key'));
    loadTestFile(require.resolve('./alerts_space1'));
    loadTestFile(require.resolve('./alerts_default_space'));
    loadTestFile(require.resolve('./builtin_alert_types'));
    loadTestFile(require.resolve('./migrations'));
  });
}
