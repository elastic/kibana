/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import type { CspFinding } from '@kbn/cloud-security-posture-common';
import { useKibana } from '../../../../common/lib/kibana';

export interface ContentProps {
  /**
   * The misconfiguration finding to render the content for.
   */
  finding: CspFinding;
}

/**
 * Content section for the misconfiguration finding flyout.
 */
export const Content: FC<ContentProps> = memo(({ finding }: ContentProps) => {
  const { cloudSecurityPosture } = useKibana().services;
  const CspFlyout = cloudSecurityPosture.getCloudSecurityPostureMisconfigurationFlyout();

  return <CspFlyout.Body finding={finding} />;
});

Content.displayName = 'Content';
