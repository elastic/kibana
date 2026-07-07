/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps } from 'react';
import React from 'react';
import { render } from '@testing-library/react';
import { UploadDashboardsPanel } from './upload_panel';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { MigrationDataInputContextProvider } from '../../../common/components';

jest.mock('../../../../common/lib/kibana/use_kibana');

const renderTestComponent = (props: ComponentProps<typeof UploadDashboardsPanel> = {}) => {
  const defaultProps: ComponentProps<typeof UploadDashboardsPanel> = {
    isUploadMore: false,
    isDisabled: false,
  };

  const finalProps: ComponentProps<typeof UploadDashboardsPanel> = {
    ...defaultProps,
    ...props,
  };

  return render(
    <IntlProvider locale="en">
      <MigrationDataInputContextProvider
        openFlyout={jest.fn()}
        closeFlyout={jest.fn()}
        isFlyoutOpen={false}
      >
        <UploadDashboardsPanel {...finalProps} />
      </MigrationDataInputContextProvider>
    </IntlProvider>
  );
};

describe('UploadDashboardsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with default props', () => {
    const { getByTestId } = renderTestComponent();
    expect(getByTestId('startDashboardMigrationUploadDashboardsButton')).toBeVisible();
    expect(getByTestId('startDashboardMigrationUploadDashboardsButton')).not.toBeDisabled();
  });

  it('disables the button when isDisabled is true', () => {
    const { getByTestId } = renderTestComponent({
      isDisabled: true,
    });

    expect(getByTestId('startDashboardMigrationUploadDashboardsButton')).toBeDisabled();
  });

  it('should show upload more button when isUploadMore is true', () => {
    const { getByTestId } = renderTestComponent({
      isUploadMore: true,
    });

    expect(getByTestId('startDashboardMigrationUploadMoreButton')).toBeVisible();
    expect(getByTestId('startDashboardMigrationUploadMoreButton')).not.toBeDisabled();
  });
});
