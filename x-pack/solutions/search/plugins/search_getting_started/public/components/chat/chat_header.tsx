/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGrid, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { DeploymentStatusBadges } from '../header/deployment_status_badges';
import { ChatColumnsGrid, ChatStretchedFlexItem } from './styles';

export const ChatHeader = () => {
  return (
    <EuiFlexGroup gutterSize="l" alignItems="flexStart" direction="column">
      <EuiFlexItem css={ChatStretchedFlexItem}>
        <DeploymentStatusBadges />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGrid columns={2} css={ChatColumnsGrid}>
          <EuiFlexItem>
            <EuiTitle size="l">
              <h1>
                {i18n.translate('xpack.search.gettingStarted.chatPage.title', {
                  defaultMessage: 'Bring your data and start building your next search experience.',
                })}
              </h1>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGrid>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
