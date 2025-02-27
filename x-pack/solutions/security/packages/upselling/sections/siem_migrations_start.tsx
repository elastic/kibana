/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import React from 'react';

export const SiemMigrationStartUpsellSection = ({
  title,
  upgradeMessage,
  upgradeHref,
}: {
  title: React.ReactNode;
  upgradeMessage: React.ReactNode;
  upgradeHref?: string;
}) => {
  return (
    <>
      <EuiPanel paddingSize="none" hasBorder>
        <EuiCallOut title={title} color="warning" iconType="lock">
          <EuiFlexGroup>
            <EuiFlexItem grow={true}>
              <p>{upgradeMessage}</p>
            </EuiFlexItem>
            {upgradeHref ? (
              <EuiFlexItem grow={false}>
                <EuiButton href={upgradeHref} color="warning" fill>
                  {'Manage License'}
                </EuiButton>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiCallOut>
      </EuiPanel>
    </>
  );
};
