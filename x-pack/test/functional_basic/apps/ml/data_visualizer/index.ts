/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('data visualizer', function () {
    // The file data visualizer should work the same as with a trial license
    loadTestFile(
      require.resolve('../../../../functional/apps/ml/data_visualizer/file_data_visualizer')
    );

    // The data visualizer should work the same as with a trial license, except the missing create actions
    // That's why the 'basic' version of 'index_data_visualizer_actions_panel' is loaded here
    loadTestFile(
      require.resolve('../../../../functional/apps/ml/data_visualizer/index_data_visualizer')
    );
    loadTestFile(
      require.resolve(
        '../../../../functional/apps/ml/data_visualizer/index_data_visualizer_grid_in_discover'
      )
    );
    loadTestFile(require.resolve('./index_data_visualizer_actions_panel'));
  });
}
