/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindingMisconfigurationFlyoutProps } from '@kbn/cloud-security-posture';
import { useKibana } from '../../../common/lib/kibana';

export const FindingsMisconfigurationPanel = ({
  ruleId,
  resourceId,
}: FindingMisconfigurationFlyoutProps) => {
  const { cloudSecurityPosture } = useKibana().services;
  return cloudSecurityPosture.getCloudSecurityPostureMisconfigurationFlyout({ ruleId, resourceId });
};
