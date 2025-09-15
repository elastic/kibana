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
      color: '#61A2FF',
    },
    detection: {
      value: 'detection',
      displayName: 'Detection',
      color: '#FF61A2',
    },
    response: {
      value: 'response',
      displayName: 'Response',
      color: '#61FFB8',
    },
  };

  return {
    pillars,
  };
};
