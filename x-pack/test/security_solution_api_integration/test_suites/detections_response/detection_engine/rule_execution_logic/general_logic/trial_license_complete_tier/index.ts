/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Rule execution logic API', function () {
    loadTestFile(require.resolve('./keyword_family'));
    loadTestFile(require.resolve('./ignore_fields'));
    loadTestFile(require.resolve('./runtime'));
    loadTestFile(require.resolve('./non_ecs_fields'));
    loadTestFile(require.resolve('./synthetic_source'));
    loadTestFile(require.resolve('./timestamps'));
  });
}
