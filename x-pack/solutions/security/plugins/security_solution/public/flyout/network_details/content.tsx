/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { NetworkDetails } from './components/network_details';
import { FlyoutBody } from '../shared/components/flyout_body';
import type { FlowTargetSourceDest } from '../../../common/search_strategy';

export interface PanelContentProps {
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
 * Network details expandable flyout right section
 */
export const PanelContent: FC<PanelContentProps> = memo(({ ip, flowTarget }: PanelContentProps) => {
  return (
    <FlyoutBody>
      <EuiSpacer size="m" />
      <NetworkDetails ip={ip} flowTarget={flowTarget} />
    </FlyoutBody>
  );
});

PanelContent.displayName = 'PanelContent';
