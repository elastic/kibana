/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiThemeProviderDecorator } from '@kbn/kibana-react-plugin/common';

export const decorators = [EuiThemeProviderDecorator];

export const parameters = {
  options: {
    storySort: {
      order: [
        'app',
        [
          'SigeventsOverview',
          [
            'SigeventsOverview',
            [
              'Act 2: Something Is Wrong',
              'Act 0: No Detection Workflows',
              'Act 1: We Know Your System',
            ],
          ],
        ],
      ],
    },
  },
};
