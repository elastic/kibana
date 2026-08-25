/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { StoryFn } from '@storybook/react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TestProvider } from '@kbn/expandable-flyout/src/test/provider';
import { FlyoutNavigation } from './flyout_navigation';

const expandDetails = () => window.alert('expand left panel');

export default {
  component: FlyoutNavigation,
  title: 'Flyout/Navigation',
};

export const Expand: StoryFn = () => {
  return (
    <TestProvider>
      <FlyoutNavigation flyoutIsExpandable={true} expandDetails={expandDetails} />
    </TestProvider>
  );
};

export const Collapse: StoryFn = () => {
  return (
    <TestProvider>
      <FlyoutNavigation flyoutIsExpandable={true} expandDetails={expandDetails} />
    </TestProvider>
  );
};
export const CollapsableWithAction: StoryFn = () => {
  return (
    <TestProvider>
      <FlyoutNavigation
        flyoutIsExpandable={true}
        expandDetails={expandDetails}
        actions={
          <EuiToolTip
            content={i18n.translate('xpack.securitySolution.flyout.navigation.shareAriaLabel', {
              defaultMessage: 'Share',
            })}
            disableScreenReaderOutput
          >
            <EuiButtonIcon
              iconType="share"
              aria-label={i18n.translate(
                'xpack.securitySolution.flyout.navigation.shareAriaLabel',
                { defaultMessage: 'Share' }
              )}
            />
          </EuiToolTip>
        }
      />
    </TestProvider>
  );
};

export const NonCollapsableWithAction: StoryFn = () => {
  return (
    <TestProvider>
      <FlyoutNavigation
        flyoutIsExpandable={false}
        actions={
          <EuiToolTip
            content={i18n.translate('xpack.securitySolution.flyout.navigation.shareAriaLabel', {
              defaultMessage: 'Share',
            })}
            disableScreenReaderOutput
          >
            <EuiButtonIcon
              iconType="share"
              aria-label={i18n.translate(
                'xpack.securitySolution.flyout.navigation.shareAriaLabel',
                { defaultMessage: 'Share' }
              )}
            />
          </EuiToolTip>
        }
      />
    </TestProvider>
  );
};

export const Empty: StoryFn = () => {
  return (
    <TestProvider>
      <FlyoutNavigation flyoutIsExpandable={false} />
    </TestProvider>
  );
};
