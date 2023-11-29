/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Index Management APIs', function () {
    this.tags(['esGate']);

    loadTestFile(require.resolve('./index_templates'));
    loadTestFile(require.resolve('./indices'));
    loadTestFile(require.resolve('./create_enrich_policies'));
    loadTestFile(require.resolve('./index_component_templates'));
    loadTestFile(require.resolve('./cluster_nodes'));
    loadTestFile(require.resolve('./datastreams'));
    loadTestFile(require.resolve('./mappings'));
    loadTestFile(require.resolve('./settings'));
  });
}
