/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { COMPARATORS } from '@kbn/alerting-comparators';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { ALERT_RULE_PARAMETERS } from '@kbn/rule-data-utils';
import { Aggregators } from '../../../../../common/custom_threshold_rule/types';
import {
  buildCustomThresholdAlert,
  buildCustomThresholdRule,
} from '../../mocks/custom_threshold_rule';
import { kibanaStartMock } from '../../../../utils/kibana_react.mock';
import { CustomThresholdAlert } from '../types';
import { LogRateAnalysis } from './log_rate_analysis';

describe('AlertDetailsAppSection', () => {
  const renderComponent = (alert: Partial<CustomThresholdAlert> = {}) => {
    return render(
      <IntlProvider locale="en">
        <LogRateAnalysis
          alert={buildCustomThresholdAlert(alert, {
            [ALERT_RULE_PARAMETERS]: {
              ...buildCustomThresholdRule().params,
              criteria: [
                {
                  comparator: COMPARATORS.GREATER_THAN,
                  metrics: [
                    {
                      name: 'A',
                      aggType: Aggregators.COUNT,
                      filter: 'host.name: *host',
                    },
                  ],
                  threshold: [2000],
                  timeSize: 15,
                  timeUnit: 'm',
                },
              ],
            },
          })}
          dataView={{}}
          services={{
            ...kibanaStartMock.startContract().services,
            uiSettings: {
              ...uiSettingsServiceMock.createStartContract(),
              get: jest.fn().mockReturnValue(true),
            },
          }}
        />
      </IntlProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // To avoid https://github.com/elastic/kibana/issues/206588
  it('should render LogRateAnalysis without throwing error', async () => {
    expect(renderComponent).not.toThrowError();
  });
});
