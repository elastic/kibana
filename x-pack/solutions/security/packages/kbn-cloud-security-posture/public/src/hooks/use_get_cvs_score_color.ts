/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';

import { getCvsScoreColor as getCvsScoreColorUtil } from '../..';

export const useGetCvsScoreColor = () => {
  const { euiTheme } = useEuiTheme();

  const getCvsScoreColor = (score: number) => {
    return getCvsScoreColorUtil(score, euiTheme);
  };

  return { getCvsScoreColor };
};
