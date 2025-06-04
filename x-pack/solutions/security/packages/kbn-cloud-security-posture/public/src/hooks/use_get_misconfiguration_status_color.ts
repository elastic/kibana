/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import type { MisconfigurationEvaluationStatus } from '@kbn/cloud-security-posture-common';
import { getMisconfigurationStatusColor as getMisconfigurationStatusColorUtil } from '../utils/get_finding_colors';

export const useGetMisconfigurationStatusColor = () => {
  const { euiTheme } = useEuiTheme();
  const getMisconfigurationStatusColor = (status: MisconfigurationEvaluationStatus) => {
    return getMisconfigurationStatusColorUtil(status, euiTheme);
  };
  return { getMisconfigurationStatusColor };
};
