/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor } from '@testing-library/react';
import { render } from '../../../utils/testing/rtl_helpers';
import { AlertingCallout, MISSING_RULES_PRIVILEGES_LABEL } from './alerting_callout';

jest.mock('../../../contexts', () => ({
  ...jest.requireActual('../../../contexts'),
  useSyntheticsStartPlugins: jest.fn().mockReturnValue({
    share: {
      url: {
        locators: {
          get: jest.fn().mockReturnValue({
            getUrl: jest.fn().mockResolvedValue('url'),
          }),
        },
      },
    },
  }),
}));

describe('AlertingCallout', () => {
  it.each([
    [false, false, false],
    [false, true, true],
    [true, false, false],
    [true, true, false],
  ])('renders correctly', async (hasConnectors, statusAlertEnabled, shouldShowCallout) => {
    const { getByText, queryByText } = render(<AlertingCallout />, {
      state: {
        dynamicSettings: {
          ...(shouldShowCallout
            ? {
                settings: {
                  defaultTLSRuleEnabled: true,
                },
              }
            : {}),
        },
        defaultAlerting: {
          data: {
            statusRule: {},
            tlsRule: {},
          },
          loading: false,
          success: true,
        },
        monitorList: {
          loaded: true,
          data: {
            total: 1,
            monitors: [
              {
                alert: {
                  status: {
                    enabled: statusAlertEnabled,
                  },
                },
              },
            ],
          },
        },
      },
    });

    await waitFor(() => {
      if (shouldShowCallout) {
        expect(getByText(/Alerts are not being sent/)).toBeInTheDocument();
      } else {
        expect(queryByText(/Alerts are not being sent/)).not.toBeInTheDocument();
      }
    });
  });

  it.each([
    [false, false, false],
    [false, true, true],
    [true, false, false],
    [true, true, false],
  ])(
    'overwrites rendering with isAlertingEnabled prop',
    async (hasConnectors, statusAlertEnabled, shouldShowCallout) => {
      const { getByText, queryByText } = render(
        <AlertingCallout isAlertingEnabled={statusAlertEnabled} />,
        {
          state: {
            dynamicSettings: {
              ...(shouldShowCallout
                ? {
                    settings: {
                      defaultTLSRuleEnabled: true,
                    },
                  }
                : {}),
            },
            defaultAlerting: {
              data: {
                statusRule: {},
                tlsRule: {},
              },
              loading: false,
              success: true,
            },
          },
        }
      );

      await waitFor(() => {
        if (shouldShowCallout) {
          expect(getByText(/Alerts are not being sent/)).toBeInTheDocument();
        } else {
          expect(queryByText(/Alerts are not being sent/)).not.toBeInTheDocument();
        }
      });
    }
  );

  it('show call out for missing privileges rules', async () => {
    const { getByText } = render(<AlertingCallout />, {
      state: {
        defaultAlerting: {
          data: {},
          loading: false,
          success: true,
        },
      },
    });

    await waitFor(() => {
      expect(getByText(/Alerts are not being sent/)).toBeInTheDocument();
      expect(getByText(MISSING_RULES_PRIVILEGES_LABEL)).toBeInTheDocument();
    });
  });
});
