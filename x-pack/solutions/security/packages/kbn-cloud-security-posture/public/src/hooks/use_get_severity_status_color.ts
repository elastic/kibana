/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { getSeverityStatusColor as getSeverityStatusColorUtil } from '../..';

export const useGetSeverityStatusColor = () => {
  const { euiTheme } = useEuiTheme();
  const getSeverityStatusColor = (status: string) => {
    return getSeverityStatusColorUtil(status, euiTheme);
  };
  return { getSeverityStatusColor };
};
