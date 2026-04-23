/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseCspOptions } from '@kbn/cloud-security-posture-common/types/findings';
import { useMisconfigurationPreview } from './use_misconfiguration_preview';

export const useHasMisconfigurations = (options: UseCspOptions) => {
  const { data } = useMisconfigurationPreview(options);

  const passedFindings = data?.count.passed || 0;
  const failedFindings = data?.count.failed || 0;

  const hasMisconfigurationFindings = passedFindings > 0 || failedFindings > 0;

  return {
    passedFindings,
    failedFindings,
    hasMisconfigurationFindings,
  };
};
