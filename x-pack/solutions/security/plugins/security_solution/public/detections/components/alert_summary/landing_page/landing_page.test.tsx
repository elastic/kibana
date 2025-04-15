/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  LANDING_PAGE_CARD_TEST_ID,
  LANDING_PAGE_IMAGE_TEST_ID,
  LANDING_PAGE_PROMPT_TEST_ID,
  LANDING_PAGE_VIEW_ALL_INTEGRATIONS_BUTTON_TEST_ID,
  LandingPage,
} from './landing_page';
import { useAddIntegrationsUrl } from '../../../../common/hooks/use_add_integrations_url';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import { installationStatuses } from '@kbn/fleet-plugin/common/constants';
import { useKibana } from '../../../../common/lib/kibana';

jest.mock('../../../../common/hooks/use_add_integrations_url');
jest.mock('../../../../common/lib/kibana');

const packages: PackageListItem[] = [
  {
    id: 'splunk',
    name: 'splunk',
    status: installationStatuses.NotInstalled,
    title: 'Splunk',
    version: '',
  },
  {
    id: 'google_secops',
    name: 'google_secops',
    status: installationStatuses.NotInstalled,
    title: 'Google SecOps',
    version: '',
  },
  {
    id: 'unknown',
    name: 'unknown',
    status: installationStatuses.NotInstalled,
    title: 'Unknown',
    version: '',
  },
];

describe('<LandingPage />', () => {
  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: { application: { navigateToApp: jest.fn() } },
    });
  });

  it('should render all the components', () => {
    (useAddIntegrationsUrl as jest.Mock).mockReturnValue({
      onClick: jest.fn(),
    });

    const { getByTestId, queryByTestId } = render(<LandingPage packages={packages} />);

    expect(getByTestId(LANDING_PAGE_PROMPT_TEST_ID)).toHaveTextContent(
      'All your alerts in one place with AI'
    );
    expect(getByTestId(LANDING_PAGE_PROMPT_TEST_ID)).toHaveTextContent(
      'Bring in your SIEM data to begin surfacing alerts'
    );

    expect(getByTestId(LANDING_PAGE_IMAGE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(`${LANDING_PAGE_CARD_TEST_ID}splunk`)).toBeInTheDocument();
    expect(getByTestId(`${LANDING_PAGE_CARD_TEST_ID}google_secops`)).toBeInTheDocument();
    expect(queryByTestId(`${LANDING_PAGE_CARD_TEST_ID}unknown`)).not.toBeInTheDocument();
    expect(getByTestId(LANDING_PAGE_VIEW_ALL_INTEGRATIONS_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should navigate to the fleet page when clicking on the more integrations button', () => {
    const moreIntegrations = jest.fn();
    (useAddIntegrationsUrl as jest.Mock).mockReturnValue({
      onClick: moreIntegrations,
    });

    const { getByTestId } = render(<LandingPage packages={packages} />);

    getByTestId(LANDING_PAGE_VIEW_ALL_INTEGRATIONS_BUTTON_TEST_ID).click();
    expect(moreIntegrations).toHaveBeenCalled();
  });
});
