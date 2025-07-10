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
  ADD_INTEGRATIONS_BUTTON_TEST_ID,
  CARD_TEST_ID,
  IntegrationSection,
} from './integration_section';
import { useIntegrationsLastActivity } from '../../../hooks/alert_summary/use_integrations_last_activity';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useNavigateToIntegrationsPage } from '../../../hooks/alert_summary/use_navigate_to_integrations_page';

jest.mock('../../../hooks/alert_summary/use_navigate_to_integrations_page');
jest.mock('../../../hooks/alert_summary/use_integrations_last_activity');
jest.mock('@kbn/kibana-react-plugin/public');

const packages: PackageListItem[] = [
  {
    id: 'splunk',
    name: 'splunk',
    icons: [{ src: 'icon.svg', path: 'mypath/icon.svg', type: 'image/svg+xml' }],
    status: installationStatuses.Installed,
    title: 'Splunk',
    version: '',
  },
  {
    id: 'google_secops',
    name: 'google_secops',
    icons: [{ src: 'icon.svg', path: 'mypath/icon.svg', type: 'image/svg+xml' }],
    status: installationStatuses.Installed,
    title: 'Google SecOps',
    version: '',
  },
];

describe('<IntegrationSection />', () => {
  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        http: {
          basePath: {
            prepend: jest.fn().mockReturnValue('/app/integrations/detail/splunk-0.1.0/overview'),
          },
        },
      },
    });
  });

  it('should render a card for each integration ', () => {
    (useNavigateToIntegrationsPage as jest.Mock).mockReturnValue(jest.fn());
    (useIntegrationsLastActivity as jest.Mock).mockReturnValue({
      isLoading: true,
      lastActivities: {},
    });

    const { getByTestId } = render(<IntegrationSection packages={packages} />);

    expect(getByTestId(`${CARD_TEST_ID}splunk`)).toHaveTextContent('Splunk');
    expect(getByTestId(`${CARD_TEST_ID}google_secops`)).toHaveTextContent('Google SecOps');
  });

  it('should navigate to the fleet page when clicking on the add integrations button', () => {
    const navigateToIntegrationsPage = jest.fn();
    (useNavigateToIntegrationsPage as jest.Mock).mockReturnValue(navigateToIntegrationsPage);
    (useIntegrationsLastActivity as jest.Mock).mockReturnValue([]);

    const { getByTestId } = render(<IntegrationSection packages={[]} />);

    getByTestId(ADD_INTEGRATIONS_BUTTON_TEST_ID).click();

    expect(navigateToIntegrationsPage).toHaveBeenCalled();
  });
});
