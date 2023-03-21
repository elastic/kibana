/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ loadTestFile }: FtrProviderContext): void => {
  describe('detection engine api security and spaces enabled - rule execution logic', function () {
    loadTestFile(require.resolve('./eql'));
    loadTestFile(require.resolve('./machine_learning'));
    loadTestFile(require.resolve('./new_terms'));
    loadTestFile(require.resolve('./query'));
    loadTestFile(require.resolve('./saved_query'));
    loadTestFile(require.resolve('./threat_match'));
    loadTestFile(require.resolve('./threshold'));
    loadTestFile(require.resolve('./non_ecs_fields'));
  });
};
