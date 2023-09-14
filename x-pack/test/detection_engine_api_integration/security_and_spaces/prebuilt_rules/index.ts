/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ loadTestFile }: FtrProviderContext): void => {
  describe('detection engine api security and spaces enabled - Prebuilt Rules', function () {
    loadTestFile(require.resolve('./get_prebuilt_rules_status'));
    loadTestFile(require.resolve('./get_prebuilt_timelines_status'));
    loadTestFile(require.resolve('./install_and_upgrade_prebuilt_rules'));
    loadTestFile(require.resolve('./fleet_integration'));
  });
};
