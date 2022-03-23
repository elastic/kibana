/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { buildUp, tearDown } from '..';

// eslint-disable-next-line import/no-default-export
export default function alertingTests({ loadTestFile, getService }: FtrProviderContext) {
  describe('Alerting', () => {
    before(async () => buildUp(getService));
    after(async () => tearDown(getService));

    loadTestFile(require.resolve('./aggregate'));
    // loadTestFile(require.resolve('./create'));
    // loadTestFile(require.resolve('./delete'));
    // loadTestFile(require.resolve('./disable'));
    // loadTestFile(require.resolve('./enable'));
    // loadTestFile(require.resolve('./find'));
    // loadTestFile(require.resolve('./get'));
    // loadTestFile(require.resolve('./get_alert_state'));
    // loadTestFile(require.resolve('./get_alert_summary'));
    // loadTestFile(require.resolve('./get_execution_log'));
    // loadTestFile(require.resolve('./rule_types'));
    // loadTestFile(require.resolve('./event_log'));
    // loadTestFile(require.resolve('./execution_status'));
    // loadTestFile(require.resolve('./monitoring'));
    // loadTestFile(require.resolve('./mute_all'));
    // loadTestFile(require.resolve('./mute_instance'));
    // loadTestFile(require.resolve('./unmute_all'));
    // loadTestFile(require.resolve('./unmute_instance'));
    // loadTestFile(require.resolve('./update'));
    // loadTestFile(require.resolve('./update_api_key'));
    // loadTestFile(require.resolve('./alerts_space1'));
    // loadTestFile(require.resolve('./alerts_default_space'));
    // loadTestFile(require.resolve('./builtin_alert_types'));
    // loadTestFile(require.resolve('./transform_rule_types'));
    // loadTestFile(require.resolve('./ml_rule_types'));
    // loadTestFile(require.resolve('./mustache_templates.ts'));
    // loadTestFile(require.resolve('./notify_when'));
    // loadTestFile(require.resolve('./ephemeral'));
    // loadTestFile(require.resolve('./event_log_alerts'));
    // loadTestFile(require.resolve('./scheduled_task_id'));
    // // Do not place test files here, due to https://github.com/elastic/kibana/issues/123059

    // // note that this test will destroy existing spaces
    // loadTestFile(require.resolve('./migrations'));
  });
}
