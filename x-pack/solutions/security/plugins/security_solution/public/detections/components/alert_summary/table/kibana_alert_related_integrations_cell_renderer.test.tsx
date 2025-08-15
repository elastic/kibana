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
  KibanaAlertRelatedIntegrationsCellRenderer,
  TABLE_RELATED_INTEGRATION_CELL_RENDERER_TEST_ID,
} from './kibana_alert_related_integrations_cell_renderer';
import {
  INTEGRATION_ICON_TEST_ID,
  INTEGRATION_LOADING_SKELETON_TEST_ID,
} from '../common/integration_icon';
import { installationStatuses } from '@kbn/fleet-plugin/common/constants';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import { usePackageIconType } from '@kbn/fleet-plugin/public/hooks';
import type { RuleResponse } from '../../../../../common/api/detection_engine';
import { useGetIntegrationFromRuleId } from '../../../hooks/alert_summary/use_get_integration_from_rule_id';

jest.mock('@kbn/fleet-plugin/public/hooks');
jest.mock('../../../hooks/alert_summary/use_get_integration_from_rule_id');

const LOADING_SKELETON_TEST_ID = `${TABLE_RELATED_INTEGRATION_CELL_RENDERER_TEST_ID}-${INTEGRATION_LOADING_SKELETON_TEST_ID}`;
const ICON_TEST_ID = `${TABLE_RELATED_INTEGRATION_CELL_RENDERER_TEST_ID}-${INTEGRATION_ICON_TEST_ID}`;

const alert: Alert = {
  _id: '_id',
  _index: '_index',
};
const packages: PackageListItem[] = [];
const rules: RuleResponse[] = [];

describe('KibanaAlertRelatedIntegrationsCellRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render integration icon', () => {
    (useGetIntegrationFromRuleId as jest.Mock).mockReturnValue({
      integration: undefined,
    });

    const { queryByTestId } = render(
      <KibanaAlertRelatedIntegrationsCellRenderer alert={alert} packages={packages} rules={rules} />
    );

    expect(queryByTestId(LOADING_SKELETON_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(ICON_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render integration icon', () => {
    (useGetIntegrationFromRuleId as jest.Mock).mockReturnValue({
      integration: {
        id: 'splunk',
        icons: [{ src: 'icon.svg', path: 'mypath/icon.svg', type: 'image/svg+xml' }],
        name: 'splunk',
        status: installationStatuses.NotInstalled,
        title: 'Splunk',
        version: '0.1.0',
      },
    });
    (usePackageIconType as jest.Mock).mockReturnValue('iconType');

    const { getByTestId, queryByTestId } = render(
      <KibanaAlertRelatedIntegrationsCellRenderer alert={alert} packages={packages} rules={rules} />
    );

    expect(queryByTestId(LOADING_SKELETON_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(ICON_TEST_ID)).toBeInTheDocument();
  });
});
