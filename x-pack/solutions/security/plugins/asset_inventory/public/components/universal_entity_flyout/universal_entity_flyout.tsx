/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { ExpandableFlyout, useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiPanel,
  EuiTitle,
} from '@elastic/eui';

const registeredPanels = [
  {
    key: 'right',
    component: () => (
      <>
        <EuiFlyoutHeader>
          <EuiTitle size="m">
            <h1>{'Right panel header'}</h1>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <p>{'Example of a right component body'}</p>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton color="primary">{'Footer button'}</EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </>
    ),
  },
  {
    key: 'left',
    component: () => (
      <EuiPanel hasShadow={false}>
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h1>{'Left panel header'}</h1>
            </EuiTitle>
          </EuiFlexItem>
          <p>{'Example of a left component content'}</p>
          <EuiFlexItem grow={false} />
        </EuiFlexGroup>
      </EuiPanel>
    ),
  },
  {
    key: 'preview1',
    component: () => (
      <EuiPanel hasShadow={false}>
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h1>{'Preview panel header'}</h1>
            </EuiTitle>
          </EuiFlexItem>
          <p>{'Example of a preview component content'}</p>
          <EuiFlexItem grow={false} />
        </EuiFlexGroup>
      </EuiPanel>
    ),
  },
  {
    key: 'preview2',
    component: () => (
      <EuiPanel hasShadow={false}>
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h1>{'Second preview panel header'}</h1>
            </EuiTitle>
          </EuiFlexItem>
          <p>{'Example of another preview component content'}</p>
          <EuiFlexItem grow={false} />
        </EuiFlexGroup>
      </EuiPanel>
    ),
  },
];

export const UniversalEntityFlyout = () => {
  const { openFlyout } = useExpandableFlyoutApi();

  useEffect(() => {
    openFlyout({ right: { id: 'right' } });
  }, []);

  return (
    <>
      <ExpandableFlyout registeredPanels={registeredPanels} />
    </>
  );
};
