/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';

export const usePillarProps = () => {
  const { euiTheme } = useEuiTheme();

  console.log(euiTheme);

  const pillars = {
    visibility: {
      value: 'visibility',
      displayName: 'Visibility',
      color: euiTheme.colors.vis.euiColorVisBehindText2,
    },
    detection: {
      value: 'detection',
      displayName: 'Detection',
      color: euiTheme.colors.vis.euiColorVisBehindText4,
    },
    response: {
      value: 'response',
      displayName: 'Response',
      color: euiTheme.colors.vis.euiColorVisBehindText0,
    },
  };

  return {
    pillars,
  };
};
