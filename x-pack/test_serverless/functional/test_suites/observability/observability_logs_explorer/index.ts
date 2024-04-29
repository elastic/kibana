/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Observability Logs Explorer', function () {
    loadTestFile(require.resolve('./app'));
    loadTestFile(require.resolve('./columns_selection'));
    loadTestFile(require.resolve('./custom_control_columns'));
    loadTestFile(require.resolve('./data_source_selection_state'));
    loadTestFile(require.resolve('./data_source_selector'));
    loadTestFile(require.resolve('./field_list'));
    loadTestFile(require.resolve('./filter_controls'));
<<<<<<< HEAD
    loadTestFile(require.resolve('./flyout'));
=======
    // loadTestFile(require.resolve('./flyout_highlights'));
    // loadTestFile(require.resolve('./flyout'));
>>>>>>> f53b567e13b79b13fdd2aa219d7f800c0e5a10be
    loadTestFile(require.resolve('./header_menu'));
  });
}
