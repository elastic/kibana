/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import { installationStatuses } from '@kbn/fleet-plugin/common/constants';
import {
  IntegrationCard,
  LAST_ACTIVITY_LOADING_SKELETON_TEST_ID,
  LAST_ACTIVITY_VALUE_TEST_ID,
} from './integration_card';
import { useKibana } from '@kbn/kibana-react-plugin/public';

jest.mock('@kbn/kibana-react-plugin/public');

const dataTestSubj = 'test-id';
const integration: PackageListItem = {
  id: 'splunk',
  icons: [{ src: 'icon.svg', path: 'mypath/icon.svg', type: 'image/svg+xml' }],
  name: 'splunk',
  status: installationStatuses.NotInstalled,
  title: 'Splunk',
  version: '0.1.0',
};

describe('<IntegrationCard />', () => {
  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: { http: { basePath: { prepend: jest.fn() } } },
    });
  });

  it('should render the card with skeleton while loading last activity', () => {
    const { getByTestId, queryByTestId } = render(
      <IntegrationCard
        data-test-subj={dataTestSubj}
        integration={integration}
        isLoading={true}
        lastActivity={undefined}
      />
    );

    expect(getByTestId(dataTestSubj)).toHaveTextContent('Splunk');
    expect(
      getByTestId(`${dataTestSubj}${LAST_ACTIVITY_LOADING_SKELETON_TEST_ID}`)
    ).toBeInTheDocument();
    expect(queryByTestId(`${dataTestSubj}${LAST_ACTIVITY_VALUE_TEST_ID}`)).not.toBeInTheDocument();
  });

  it('should render the card with last activity value', () => {
    const lastActivity = 1735711200000; // Wed Jan 01 2025 00:00:00 GMT-0600 (Central Standard Time)
    const { getByTestId, queryByTestId } = render(
      <IntegrationCard
        data-test-subj={dataTestSubj}
        integration={integration}
        isLoading={false}
        lastActivity={lastActivity}
      />
    );

    expect(
      queryByTestId(`${dataTestSubj}${LAST_ACTIVITY_LOADING_SKELETON_TEST_ID}`)
    ).not.toBeInTheDocument();
    expect(getByTestId(`${dataTestSubj}${LAST_ACTIVITY_VALUE_TEST_ID}`)).toHaveTextContent(
      'Last synced: 2025-01-01T06:00:00Z'
    );
  });
});
