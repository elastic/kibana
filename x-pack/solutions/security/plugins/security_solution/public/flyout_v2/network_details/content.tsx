/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { NetworkDetails } from './components/network_details';
import { FlyoutBody } from '../../flyout/shared/components/flyout_body';
import type { FlowTargetSourceDest } from '../../../common/search_strategy';

export interface ContentProps {
  /**
   * IP value
   */
  ip: string;
  /**
   * Destination or source information
   */
  flowTarget: FlowTargetSourceDest;
}

/**
 * Network details flyout content section.
 */
export const Content: FC<ContentProps> = memo(({ ip, flowTarget }: ContentProps) => {
  return (
    <FlyoutBody>
      <NetworkDetails ip={ip} flowTarget={flowTarget} />
    </FlyoutBody>
  );
});

Content.displayName = 'Content';
