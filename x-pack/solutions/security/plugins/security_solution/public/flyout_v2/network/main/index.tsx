/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { EuiFlyoutHeader, EuiFlyoutBody } from '@elastic/eui';
import type { FlowTargetSourceDest } from '../../../../common/search_strategy';
import { Header } from './header';
import { Content } from './content';

export interface NetworkProps {
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
 * Network details flyout content.
 */
export const Network: FC<NetworkProps> = memo(({ ip, flowTarget }) => {
  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <Header ip={ip} flowTarget={flowTarget} />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <Content ip={ip} flowTarget={flowTarget} />
      </EuiFlyoutBody>
    </>
  );
});

Network.displayName = 'Network';
