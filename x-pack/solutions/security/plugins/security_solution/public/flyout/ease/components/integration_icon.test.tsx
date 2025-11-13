/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import React from 'react';
import { useFetchIntegrations } from '../../../detections/hooks/alert_summary/use_fetch_integrations';
import { usePackageIconType } from '@kbn/fleet-plugin/public/hooks';
import { INTEGRATION_TEST_ID, IntegrationIcon } from './integration_icon';
import {
  INTEGRATION_ICON_TEST_ID,
  INTEGRATION_LOADING_SKELETON_TEST_ID,
} from '../../../detections/components/alert_summary/common/integration_icon';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import { installationStatuses } from '@kbn/fleet-plugin/common/constants';

jest.mock('../../../detections/hooks/alert_summary/use_fetch_integrations');
jest.mock('@kbn/fleet-plugin/public/hooks');

const LOADING_SKELETON_TEST_ID = `${INTEGRATION_TEST_ID}-${INTEGRATION_LOADING_SKELETON_TEST_ID}`;
const ICON_TEST_ID = `${INTEGRATION_TEST_ID}-${INTEGRATION_ICON_TEST_ID}`;

describe('IntegrationIcon', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a single integration icon', () => {
    const installedPackages: PackageListItem[] = [
      {
        id: 'splunk',
        icons: [{ src: 'icon.svg', path: 'mypath/icon.svg', type: 'image/svg+xml' }],
        name: 'splunk',
        status: installationStatuses.NotInstalled,
        title: 'Splunk',
        version: '0.1.0',
      },
    ];
    (useFetchIntegrations as jest.Mock).mockReturnValue({
      installedPackages,
      isLoading: false,
    });
    (usePackageIconType as jest.Mock).mockReturnValue('iconType');

    const { getByTestId } = render(
      <IntlProvider locale="en">
        <IntegrationIcon integrationName={'splunk'} />
      </IntlProvider>
    );

    expect(getByTestId(ICON_TEST_ID)).toBeInTheDocument();
  });

  it('should return the loading skeleton is integrations are loading', () => {
    (useFetchIntegrations as jest.Mock).mockReturnValue({
      installedPackages: [],
      isLoading: true,
    });

    const { getByTestId, queryByTestId } = render(
      <IntlProvider locale="en">
        <IntegrationIcon integrationName={''} />
      </IntlProvider>
    );

    expect(getByTestId(LOADING_SKELETON_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(ICON_TEST_ID)).not.toBeInTheDocument();
  });
});
