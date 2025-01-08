/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';

import { getMisconfigurationStatusColor as getMisconfigurationStatusColorUtil } from '../..';

export const useMisconfigurationStatusColor = () => {
  const { euiTheme } = useEuiTheme();

  // TODO: implement type for status
  const getMisconfigurationStatusColor = (status: 'passed' | 'failed' | 'unknown') => {
    return getMisconfigurationStatusColorUtil(status, euiTheme);
  };

  return { getMisconfigurationStatusColor };
};
