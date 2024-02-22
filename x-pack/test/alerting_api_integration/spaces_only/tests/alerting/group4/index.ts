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

    loadTestFile(require.resolve('./alerts_as_data'));
    loadTestFile(require.resolve('./builtin_alert_types'));
    loadTestFile(require.resolve('./mustache_templates.ts'));
    loadTestFile(require.resolve('./notify_when'));
    loadTestFile(require.resolve('./ephemeral'));
    loadTestFile(require.resolve('./event_log_alerts'));
    loadTestFile(require.resolve('./snooze'));
    loadTestFile(require.resolve('./unsnooze'));
    loadTestFile(require.resolve('./bulk_edit'));
    loadTestFile(require.resolve('./bulk_disable'));
    loadTestFile(require.resolve('./capped_action_type'));
    loadTestFile(require.resolve('./scheduled_task_id'));
    loadTestFile(require.resolve('./run_soon'));
    loadTestFile(require.resolve('./flapping_history'));
    loadTestFile(require.resolve('./check_registered_rule_types'));
    loadTestFile(require.resolve('./alert_delay'));
    loadTestFile(require.resolve('./generate_alert_schemas'));
    // Do not place test files here, due to https://github.com/elastic/kibana/issues/123059

    // note that this test will destroy existing spaces
    loadTestFile(require.resolve('./migrations.ts'));
    loadTestFile(require.resolve('./migrations/index.ts'));
  });
}
