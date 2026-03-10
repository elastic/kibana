/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ loadTestFile }: FtrProviderContext): void => {
  describe('Rules Management - Prebuilt Rules Customization (Customization Enabled)', function () {
    loadTestFile(require.resolve('./detect_customization_with_base_version'));
    loadTestFile(require.resolve('./detect_customization_without_base_version'));
    loadTestFile(require.resolve('./customize_via_bulk_editing'));
    loadTestFile(require.resolve('./unaffected_fields'));
  });
};
