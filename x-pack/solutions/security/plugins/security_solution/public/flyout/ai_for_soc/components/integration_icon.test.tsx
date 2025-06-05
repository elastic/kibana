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
import { useFindRulesQuery } from '../../../detection_engine/rule_management/api/hooks/use_find_rules_query';
import { useGetIntegrationFromRuleId } from '../../../detections/hooks/alert_summary/use_get_integration_from_rule_id';
import { usePackageIconType } from '@kbn/fleet-plugin/public/hooks';
import { INTEGRATION_TEST_ID, IntegrationIcon } from './integration_icon';
import {
  INTEGRATION_ICON_TEST_ID,
  INTEGRATION_LOADING_SKELETON_TEST_ID,
} from '../../../detections/components/alert_summary/common/integration_icon';

jest.mock('../../../detections/hooks/alert_summary/use_fetch_integrations');
jest.mock('../../../detection_engine/rule_management/api/hooks/use_find_rules_query');
jest.mock('../../../detections/hooks/alert_summary/use_get_integration_from_rule_id');
jest.mock('@kbn/fleet-plugin/public/hooks');

const LOADING_SKELETON_TEST_ID = `${INTEGRATION_TEST_ID}-${INTEGRATION_LOADING_SKELETON_TEST_ID}`;
const ICON_TEST_ID = `${INTEGRATION_TEST_ID}-${INTEGRATION_ICON_TEST_ID}`;

describe('IntegrationIcon', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a single integration icon', () => {
    (useFindRulesQuery as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
    });
    (useFetchIntegrations as jest.Mock).mockReturnValue({
      installedPackages: [],
      isLoading: false,
    });
    (useGetIntegrationFromRuleId as jest.Mock).mockReturnValue({
      integration: {
        title: 'title',
        icons: [{ type: 'type', src: 'src' }],
        name: 'name',
        version: 'version',
      },
    });
    (usePackageIconType as jest.Mock).mockReturnValue('iconType');

    const { getByTestId } = render(
      <IntlProvider locale="en">
        <IntegrationIcon ruleId={'name'} />
      </IntlProvider>
    );

    expect(getByTestId(ICON_TEST_ID)).toBeInTheDocument();
  });

  it('should return the loading skeleton is rules are loading', () => {
    (useFindRulesQuery as jest.Mock).mockReturnValue({
      data: [],
      isLoading: true,
    });
    (useFetchIntegrations as jest.Mock).mockReturnValue({
      installedPackages: [],
      isLoading: false,
    });
    (useGetIntegrationFromRuleId as jest.Mock).mockReturnValue({
      integration: {},
    });

    const { getByTestId, queryByTestId } = render(
      <IntlProvider locale="en">
        <IntegrationIcon ruleId={''} />
      </IntlProvider>
    );

    expect(getByTestId(LOADING_SKELETON_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(ICON_TEST_ID)).not.toBeInTheDocument();
  });

  it('should return the loading skeleton is integrations are loading', () => {
    (useFindRulesQuery as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
    });
    (useFetchIntegrations as jest.Mock).mockReturnValue({
      installedPackages: [],
      isLoading: true,
    });
    (useGetIntegrationFromRuleId as jest.Mock).mockReturnValue({
      integration: {},
    });

    const { getByTestId, queryByTestId } = render(
      <IntlProvider locale="en">
        <IntegrationIcon ruleId={''} />
      </IntlProvider>
    );

    expect(getByTestId(LOADING_SKELETON_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(ICON_TEST_ID)).not.toBeInTheDocument();
  });
});
