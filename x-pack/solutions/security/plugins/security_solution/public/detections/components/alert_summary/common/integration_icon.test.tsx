/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import React from 'react';
import {
  INTEGRATION_ICON_TEST_ID,
  INTEGRATION_LOADING_SKELETON_TEST_ID,
  IntegrationIcon,
} from './integration_icon';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import { installationStatuses } from '@kbn/fleet-plugin/common/constants';
import { usePackageIconType } from '@kbn/fleet-plugin/public/hooks';

jest.mock('@kbn/fleet-plugin/public/hooks');

const testId = 'testid';
const integration: PackageListItem = {
  id: 'splunk',
  icons: [{ src: 'icon.svg', path: 'mypath/icon.svg', type: 'image/svg+xml' }],
  name: 'splunk',
  status: installationStatuses.NotInstalled,
  title: 'Splunk',
  version: '0.1.0',
};

describe('IntegrationIcon', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (usePackageIconType as jest.Mock).mockReturnValue('iconType');
  });

  it('should render a single integration icon', () => {
    const { getByTestId } = render(
      <IntlProvider locale="en">
        <IntegrationIcon data-test-subj={testId} integration={integration} />
      </IntlProvider>
    );

    expect(getByTestId(`${testId}-${INTEGRATION_ICON_TEST_ID}`)).toBeInTheDocument();
  });

  it('should render the loading skeleton', () => {
    const { getByTestId } = render(
      <IntlProvider locale="en">
        <IntegrationIcon data-test-subj={testId} integration={undefined} isLoading={true} />
      </IntlProvider>
    );

    expect(getByTestId(`${testId}-${INTEGRATION_LOADING_SKELETON_TEST_ID}`)).toBeInTheDocument();
  });

  it('should not render skeleton or icon', () => {
    const { queryByTestId } = render(
      <IntlProvider locale="en">
        <IntegrationIcon data-test-subj={testId} integration={undefined} />
      </IntlProvider>
    );

    expect(queryByTestId(`${testId}-${INTEGRATION_ICON_TEST_ID}`)).not.toBeInTheDocument();
    expect(
      queryByTestId(`${testId}-${INTEGRATION_LOADING_SKELETON_TEST_ID}`)
    ).not.toBeInTheDocument();
  });
});
