/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import React from 'react';
import { useGetIntegrationFromRuleId } from '../../../hooks/alert_summary/use_get_integration_from_rule_id';
import { usePackageIconType } from '@kbn/fleet-plugin/public/hooks';
import {
  INTEGRATION_INTEGRATION_ICON_TEST_ID,
  INTEGRATION_LOADING_SKELETON_TEST_ID,
  IntegrationIcon,
} from './integration_icon';

jest.mock('../../../hooks/alert_summary/use_get_integration_from_rule_id');
jest.mock('@kbn/fleet-plugin/public/hooks');

describe('IntegrationIcon', () => {
  it('should return a single integration icon', () => {
    (useGetIntegrationFromRuleId as jest.Mock).mockReturnValue({
      integration: {
        title: 'title',
        icons: [{ type: 'type', src: 'src' }],
        name: 'name',
        version: 'version',
      },
      isLoading: false,
    });
    (usePackageIconType as jest.Mock).mockReturnValue('iconType');

    const { getByTestId } = render(
      <IntlProvider locale="en">
        <IntegrationIcon ruleId={'name'} />
      </IntlProvider>
    );

    expect(getByTestId(INTEGRATION_INTEGRATION_ICON_TEST_ID)).toBeInTheDocument();
  });

  it('should return a single integration loading', () => {
    (useGetIntegrationFromRuleId as jest.Mock).mockReturnValue({
      integration: {},
      isLoading: true,
    });

    const { getByTestId } = render(
      <IntlProvider locale="en">
        <IntegrationIcon ruleId={''} />
      </IntlProvider>
    );

    expect(getByTestId(INTEGRATION_LOADING_SKELETON_TEST_ID)).toBeInTheDocument();
  });
});
