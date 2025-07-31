/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ loadTestFile }: FtrProviderContext): void => {
  loadTestFile(require.resolve('./calculate_is_customized'));
  loadTestFile(require.resolve('./customize_prebuilt_rules'));
  loadTestFile(require.resolve('./customize_via_bulk_editing'));
};
