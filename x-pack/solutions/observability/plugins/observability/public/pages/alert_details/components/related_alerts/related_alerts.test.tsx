/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../../../utils/test_helper';
import { alertWithGroupsAndTags } from '../../mock/alert';
import { useKibana } from '../../../../utils/kibana_react';
import { kibanaStartMock } from '../../../../utils/kibana_react.mock';
import { RelatedAlerts } from './related_alerts';
import { ObservabilityAlertsTable } from '../../../../components/alerts_table/alerts_table_lazy';
import {
  OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES,
  observabilityAlertFeatureIds,
} from '../../../../../common/constants';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
}));

jest.mock('../../../utils/kibana_react');

jest.mock('../../../components/alerts_table/alerts_table_lazy');
const mockAlertsTable = jest.mocked(ObservabilityAlertsTable).mockReturnValue(<div />);

jest.mock('@kbn/alerts-grouping', () => ({
  AlertsGrouping: jest.fn().mockImplementation(({ children }) => <div>{children([])}</div>),
}));

const useKibanaMock = useKibana as jest.Mock;
const mockKibana = () => {
  useKibanaMock.mockReturnValue({
    services: {
      ...kibanaStartMock.startContract().services,
      http: {
        basePath: {
          prepend: jest.fn(),
        },
      },
    },
  });
};

describe('Related alerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKibana();
  });

  it('should pass the correct configuration options to the alerts table', async () => {
    render(<RelatedAlerts alert={alertWithGroupsAndTags} />);

    expect(mockAlertsTable).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: 'xpack.observability.related.alerts.table',
        ruleTypeIds: OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES,
        consumers: observabilityAlertFeatureIds,
        initialPageSize: 50,
        renderAdditionalToolbarControls: expect.any(Function),
        showInspectButton: true,
      }),
      expect.anything()
    );
  });
});
