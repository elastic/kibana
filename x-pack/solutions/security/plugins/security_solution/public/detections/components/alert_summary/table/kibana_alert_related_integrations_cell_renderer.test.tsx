/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { Alert } from '@kbn/alerting-types';
import {
  ICON_TEST_ID,
  KibanaAlertRelatedIntegrationsCellRenderer,
  SKELETON_TEST_ID,
} from './kibana_alert_related_integrations_cell_renderer';
import { useGetIntegrationFromPackageName } from '../../../hooks/alert_summary/use_get_integration_from_package_name';
import { ALERT_RULE_PARAMETERS } from '@kbn/rule-data-utils';

jest.mock('../../../hooks/alert_summary/use_get_integration_from_package_name');

describe('KibanaAlertRelatedIntegrationsCellRenderer', () => {
  it('should handle missing field', () => {
    (useGetIntegrationFromPackageName as jest.Mock).mockReturnValue({
      integration: null,
      isLoading: false,
    });

    const alert: Alert = {
      _id: '_id',
      _index: '_index',
    };

    const { queryByTestId } = render(<KibanaAlertRelatedIntegrationsCellRenderer alert={alert} />);

    expect(queryByTestId(SKELETON_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(ICON_TEST_ID)).not.toBeInTheDocument();
  });

  it('should handle not finding matching integration', () => {
    (useGetIntegrationFromPackageName as jest.Mock).mockReturnValue({
      integration: null,
      isLoading: false,
    });

    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      [ALERT_RULE_PARAMETERS]: ['splunk'],
    };

    const { queryByTestId } = render(<KibanaAlertRelatedIntegrationsCellRenderer alert={alert} />);

    expect(queryByTestId(SKELETON_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(ICON_TEST_ID)).not.toBeInTheDocument();
  });

  it('should show loading', () => {
    (useGetIntegrationFromPackageName as jest.Mock).mockReturnValue({
      integration: null,
      isLoading: true,
    });

    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      [ALERT_RULE_PARAMETERS]: ['splunk'],
    };

    const { getByTestId, queryByTestId } = render(
      <KibanaAlertRelatedIntegrationsCellRenderer alert={alert} />
    );

    expect(getByTestId(SKELETON_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(ICON_TEST_ID)).not.toBeInTheDocument();
  });

  it('should show integration icon', () => {
    (useGetIntegrationFromPackageName as jest.Mock).mockReturnValue({
      integration: { name: 'Splunk', icon: ['icon'] },
      isLoading: false,
    });

    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      [ALERT_RULE_PARAMETERS]: ['splunk'],
    };

    const { getByTestId, queryByTestId } = render(
      <KibanaAlertRelatedIntegrationsCellRenderer alert={alert} />
    );

    expect(queryByTestId(SKELETON_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(ICON_TEST_ID)).toBeInTheDocument();
  });
});
