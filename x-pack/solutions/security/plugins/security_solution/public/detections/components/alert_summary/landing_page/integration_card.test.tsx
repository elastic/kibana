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
import { IntegrationCard } from './integration_card';
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
  it('should render the card and navigate to the integration details page', () => {
    const navigateToApp = jest.fn();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: { navigateToApp },
        http: {
          basePath: {
            prepend: jest.fn().mockReturnValue('/app/integrations/detail/splunk-0.1.0/overview'),
          },
        },
      },
    });

    const { getByTestId } = render(
      <IntegrationCard integration={integration} data-test-subj={dataTestSubj} />
    );

    const card = getByTestId(dataTestSubj);

    expect(card).toHaveTextContent('Splunk');
    expect(card).toHaveTextContent('SIEM');

    card.click();

    expect(navigateToApp).toHaveBeenCalledWith('integrations', {
      path: '/detail/splunk-0.1.0/overview',
    });
  });
});
