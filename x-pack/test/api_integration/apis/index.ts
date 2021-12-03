/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('apis', function () {
    this.tags('ciGroup18');

    loadTestFile(require.resolve('./search'));
    loadTestFile(require.resolve('./es'));
    loadTestFile(require.resolve('./security'));
    loadTestFile(require.resolve('./spaces'));
    loadTestFile(require.resolve('./monitoring'));
    loadTestFile(require.resolve('./features'));
    loadTestFile(require.resolve('./telemetry'));
    loadTestFile(require.resolve('./logstash'));
    loadTestFile(require.resolve('./kibana'));
    loadTestFile(require.resolve('./metrics_ui'));
    loadTestFile(require.resolve('./console'));
    loadTestFile(require.resolve('./management'));
    loadTestFile(require.resolve('./uptime'));
    loadTestFile(require.resolve('./maps'));
    loadTestFile(require.resolve('./security_solution'));
    loadTestFile(require.resolve('./lens'));
    loadTestFile(require.resolve('./transform'));
    loadTestFile(require.resolve('./lists'));
    loadTestFile(require.resolve('./upgrade_assistant'));
    loadTestFile(require.resolve('./searchprofiler'));
    loadTestFile(require.resolve('./painless_lab'));
    loadTestFile(require.resolve('./file_upload'));
    loadTestFile(require.resolve('./ml'));
    loadTestFile(require.resolve('./watcher'));
  });
}
