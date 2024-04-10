/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Rule execution logic', function () {
    loadTestFile(require.resolve('./ignore_fields'));
    loadTestFile(require.resolve('./runtime_fields'));
    loadTestFile(require.resolve('./timestamps'));
    loadTestFile(require.resolve('./non_ecs_fields'));
    loadTestFile(require.resolve('./rules'));
    loadTestFile(require.resolve('./keyword_family'));
  });
}
