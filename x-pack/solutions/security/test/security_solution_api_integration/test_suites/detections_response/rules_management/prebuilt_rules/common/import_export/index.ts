/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ loadTestFile }: FtrProviderContext): void => {
  loadTestFile(require.resolve('./export_prebuilt_rules'));
  loadTestFile(require.resolve('./import_single_prebuilt_rule'));
  loadTestFile(require.resolve('./import_multiple_prebuilt_rules'));
  loadTestFile(require.resolve('./import_outdated_prebuilt_rules'));
  loadTestFile(require.resolve('./import_with_missing_base_version'));
  loadTestFile(require.resolve('./import_with_missing_fields'));
};
