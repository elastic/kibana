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

export interface PanelContentProps {
  /**
   * IP value
   */
  ip: string;
  /**
   * Destination or source information
   */
  flowTarget: FlowTargetSourceDest;
  /**
   * True for old flyout, false for v2, should remove when old flyout is removed
   */
  isOldFlyout?: boolean;
}

/**
 * Network details flyout content section.
 */
export const PanelContent: FC<PanelContentProps> = memo(
  ({ ip, flowTarget, isOldFlyout }: PanelContentProps) => {
    return (
      <FlyoutBody paddingSize={isOldFlyout ? undefined : 'none'}>
        <NetworkDetails ip={ip} flowTarget={flowTarget} />
      </FlyoutBody>
    );
  }
);

PanelContent.displayName = 'PanelContent';
