/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import * as reactTestingLibrary from '@testing-library/react';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import {
  type AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../common/mock/endpoint';
import { ResponseActionsListPage } from './response_actions_list_page';
import type { ActionListApiResponse } from '../../../../../common/endpoint/types';
import { MANAGEMENT_PATH } from '../../../../../common/constants';
import { getActionListMock } from '../../../components/endpoint_response_actions_list/mocks';
import { useGetEndpointsList } from '../../../hooks/endpoint/use_get_endpoints_list';
import { ExperimentalFeaturesService } from '../../../../common/experimental_features_service';
import { allowedExperimentalValues } from '../../../../../common';

let mockUseGetEndpointActionList: {
  isFetched?: boolean;
  isFetching?: boolean;
  error?: Partial<IHttpFetchError> | null;
  data?: ActionListApiResponse;
  refetch: () => unknown;
};
jest.mock('../../../hooks/response_actions/use_get_endpoint_action_list', () => {
  const original = jest.requireActual(
    '../../../hooks/response_actions/use_get_endpoint_action_list'
  );
  return {
    ...original,
    useGetEndpointActionList: () => mockUseGetEndpointActionList,
  };
});

jest.mock('../../../../common/experimental_features_service');

jest.mock('@kbn/kibana-react-plugin/public', () => {
  const original = jest.requireActual('@kbn/kibana-react-plugin/public');
  return {
    ...original,
    useKibana: () => ({
      services: {
        uiSettings: {
          get: jest.fn().mockImplementation((key) => {
            const get = (k: 'dateFormat' | 'timepicker:quickRanges') => {
              const x = {
                dateFormat: 'MMM D, YYYY @ HH:mm:ss.SSS',
                'timepicker:quickRanges': [
                  {
                    from: 'now/d',
                    to: 'now/d',
                    display: 'Today',
                  },
                  {
                    from: 'now/w',
                    to: 'now/w',
                    display: 'This week',
                  },
                  {
                    from: 'now-15m',
                    to: 'now',
                    display: 'Last 15 minutes',
                  },
                  {
                    from: 'now-30m',
                    to: 'now',
                    display: 'Last 30 minutes',
                  },
                  {
                    from: 'now-1h',
                    to: 'now',
                    display: 'Last 1 hour',
                  },
                  {
                    from: 'now-24h',
                    to: 'now',
                    display: 'Last 24 hours',
                  },
                  {
                    from: 'now-7d',
                    to: 'now',
                    display: 'Last 7 days',
                  },
                  {
                    from: 'now-30d',
                    to: 'now',
                    display: 'Last 30 days',
                  },
                  {
                    from: 'now-90d',
                    to: 'now',
                    display: 'Last 90 days',
                  },
                  {
                    from: 'now-1y',
                    to: 'now',
                    display: 'Last 1 year',
                  },
                ],
              };
              return x[k];
            };
            return get(key);
          }),
        },
      },
    }),
  };
});

jest.mock('../../../hooks/endpoint/use_get_endpoints_list');
const mockUseGetEndpointsList = useGetEndpointsList as jest.Mock;

describe('Response actions history page', () => {
  const testPrefix = 'response-actions-list';

  let user: UserEvent;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let history: AppContextTestRender['history'];
  let mockedContext: AppContextTestRender;

  const refetchFunction = jest.fn();
  const baseMockedActionList = {
    isFetched: true,
    isFetching: false,
    error: null,
    refetch: refetchFunction,
  };

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
      pointerEventsCheck: 0,
    });

    (ExperimentalFeaturesService.get as jest.Mock).mockReturnValue(allowedExperimentalValues);

    mockedContext = createAppRootMockRenderer();
    ({ history } = mockedContext);
    render = () => (renderResult = mockedContext.render(<ResponseActionsListPage />));
    reactTestingLibrary.act(() => {
      history.push(`${MANAGEMENT_PATH}/response_actions_history`);
    });

    mockUseGetEndpointActionList = {
      ...baseMockedActionList,
      data: await getActionListMock({ actionCount: 43 }),
    };

    mockUseGetEndpointsList.mockReturnValue({
      data: Array.from({ length: 10 }).map((_, i) => {
        return {
          id: `agent-id-${i}`,
          name: `Host-name-${i}`,
        };
      }),
      page: 0,
      pageSize: 50,
      total: 10,
    });
  });

  afterEach(() => {
    mockUseGetEndpointActionList = {
      ...baseMockedActionList,
    };
    jest.clearAllMocks();
    jest.runOnlyPendingTimers();
  });

  describe('Hide/Show header', () => {
    it('should show header when data is in', () => {
      reactTestingLibrary.act(() => {
        history.push(`${MANAGEMENT_PATH}/response_actions_history?page=3&pageSize=20`);
      });
      render();
      const { getByTestId } = renderResult;
      expect(getByTestId('responseActionsPage-header')).toBeTruthy();
    });

    it('should not show header when there is no actions index', () => {
      reactTestingLibrary.act(() => {
        history.push(`${MANAGEMENT_PATH}/response_actions_history?page=3&pageSize=20`);
      });
      mockUseGetEndpointActionList = {
        ...baseMockedActionList,
        error: {
          body: { statusCode: 404, message: 'index_not_found_exception' },
        },
      };
      render();
      const { queryByTestId } = renderResult;
      expect(queryByTestId('responseActionsPage-header')).toBeNull();
    });
  });

  describe('Read from URL params', () => {
    it('should read and set paging values from URL params', () => {
      reactTestingLibrary.act(() => {
        history.push(`${MANAGEMENT_PATH}/response_actions_history?page=3&pageSize=20`);
      });
      render();
      const { getByTestId } = renderResult;

      expect(history.location.search).toEqual('?page=3&pageSize=20');
      expect(getByTestId('tablePaginationPopoverButton').textContent).toContain('20');
      expect(getByTestId('pagination-button-2').getAttribute('aria-current')).toStrictEqual('page');
    });

    it('should read and set command filter values from URL params', async () => {
      const filterPrefix = 'actions-filter';
      reactTestingLibrary.act(() => {
        history.push(`${MANAGEMENT_PATH}/response_actions_history?commands=release,processes`);
      });

      render();
      const { getAllByTestId, getByTestId } = renderResult;
      await user.click(getByTestId(`${testPrefix}-${filterPrefix}-popoverButton`));
      const allFilterOptions = getAllByTestId(`${filterPrefix}-option`);

      const selectedFilterOptions = allFilterOptions.reduce<string[]>((acc, option) => {
        if (option.getAttribute('aria-checked') === 'true') {
          acc.push(option.textContent?.split('-')[0].trim() as string);
        }
        return acc;
      }, []);

      expect(selectedFilterOptions.length).toEqual(2);
      expect(selectedFilterOptions).toEqual([
        'release. Checked option. To uncheck this option, press Enter.',
        'processes. Checked option. To uncheck this option, press Enter.',
      ]);
      expect(history.location.search).toEqual('?commands=release,processes');
    });

    it('should read and set hosts filter values from URL params', async () => {
      mockUseGetEndpointsList.mockReturnValue({
        data: Array.from({ length: 10 }).map((_, i) => {
          return {
            id: `agent-id-${i}`,
            name: `Host-name-${i}`,
            selected: [0, 1, 3, 5].includes(i),
          };
        }),
        page: 0,
        pageSize: 50,
        total: 10,
      });

      const filterPrefix = 'hosts-filter';
      reactTestingLibrary.act(() => {
        history.push(
          `${MANAGEMENT_PATH}/response_actions_history?hosts=agent-id-1,agent-id-2,agent-id-4,agent-id-5`
        );
      });

      render();
      const { getAllByTestId, getByTestId } = renderResult;

      await user.click(getByTestId(`${testPrefix}-${filterPrefix}-popoverButton`));
      const allFilterOptions = getAllByTestId(`${filterPrefix}-option`);

      const selectedFilterOptions = allFilterOptions.reduce<string[]>((acc, option) => {
        if (option.getAttribute('aria-checked') === 'true') {
          acc.push(option.textContent?.split(' - ')[0] as string);
        }
        return acc;
      }, []);

      expect(selectedFilterOptions.length).toEqual(4);
      expect(selectedFilterOptions).toEqual([
        'Host-name-0. Checked option. To uncheck this option, press Enter.',
        'Host-name-1. Checked option. To uncheck this option, press Enter.',
        'Host-name-3. Checked option. To uncheck this option, press Enter.',
        'Host-name-5. Checked option. To uncheck this option, press Enter.',
      ]);
      expect(history.location.search).toEqual('?hosts=agent-id-1,agent-id-2,agent-id-4,agent-id-5');
    });

    it('should read and set status filter values from URL params', async () => {
      const filterPrefix = 'statuses-filter';
      reactTestingLibrary.act(() => {
        history.push(`${MANAGEMENT_PATH}/response_actions_history?statuses=pending,failed`);
      });

      render();
      const { getAllByTestId, getByTestId } = renderResult;
      await user.click(getByTestId(`${testPrefix}-${filterPrefix}-popoverButton`));
      const allFilterOptions = getAllByTestId(`${filterPrefix}-option`);

      const selectedFilterOptions = allFilterOptions.reduce<string[]>((acc, option) => {
        if (option.getAttribute('aria-checked') === 'true') {
          acc.push(option.textContent?.split('-')[0].trim() as string);
        }
        return acc;
      }, []);

      expect(selectedFilterOptions.length).toEqual(2);
      expect(selectedFilterOptions).toEqual([
        'Failed. Checked option.',
        'Pending. Checked option.',
      ]);
      expect(history.location.search).toEqual('?statuses=pending,failed');
    });

    it('should set selected users search input strings to URL params ', () => {
      const filterPrefix = 'users-filter';
      reactTestingLibrary.act(() => {
        history.push(`${MANAGEMENT_PATH}/response_actions_history?users=userX,userY`);
      });

      render();
      const { getByTestId } = renderResult;
      const usersInput = getByTestId(`${testPrefix}-${filterPrefix}-search`);
      expect(usersInput).toHaveValue('userX,userY');
      expect(history.location.search).toEqual('?users=userX,userY');
    });

    it('should read and set relative date ranges filter values from URL params', () => {
      reactTestingLibrary.act(() => {
        history.push(
          `${MANAGEMENT_PATH}/response_actions_history?startDate=now-23m&endDate=now-1m`
        );
      });

      render();
      const { getByTestId } = renderResult;

      expect(getByTestId('superDatePickerstartDatePopoverButton').textContent).toEqual(
        '~ 23 minutes ago'
      );
      expect(getByTestId('superDatePickerendDatePopoverButton').textContent).toEqual(
        '~ a minute ago'
      );
      expect(history.location.search).toEqual('?startDate=now-23m&endDate=now-1m');
    });

    it('should read and set absolute date ranges filter values from URL params', () => {
      const startDate = '2022-09-12T11:00:00.000Z';
      const endDate = '2022-09-12T11:30:33.000Z';
      reactTestingLibrary.act(() => {
        history.push(
          `${MANAGEMENT_PATH}/response_actions_history?startDate=${startDate}&endDate=${endDate}`
        );
      });

      const { getByTestId } = render();

      expect(getByTestId('superDatePickerstartDatePopoverButton').textContent).toEqual(
        'Sep 12, 2022 @ 07:00:00.000'
      );
      expect(getByTestId('superDatePickerendDatePopoverButton').textContent).toEqual(
        'Sep 12, 2022 @ 07:30:33.000'
      );
      expect(history.location.search).toEqual(`?startDate=${startDate}&endDate=${endDate}`);
    });

    it('should read and expand actions using `withOutputs`', () => {
      const allActionIds = mockUseGetEndpointActionList.data?.data.map((action) => action.id) ?? [];
      // select 5 actions to show details
      const actionIdsWithDetails = allActionIds.filter((_, i) => [0, 2, 3, 4, 5].includes(i));
      reactTestingLibrary.act(() => {
        // load page 1 but with expanded actions.
        history.push(
          `${MANAGEMENT_PATH}/response_actions_history?withOutputs=${actionIdsWithDetails.join(
            ','
          )}&page=1&pageSize=10`
        );
      });

      const { getByTestId, getAllByTestId } = render();

      // verify on page 1
      expect(getByTestId(`${testPrefix}-endpointListTableTotal`)).toHaveTextContent(
        'Showing 1-10 of 43 response actions'
      );

      const traysOnPage1 = getAllByTestId(`${testPrefix}-details-tray`);
      const expandButtonsOnPage1 = getAllByTestId(`${testPrefix}-expand-button`);
      const expandedButtons = expandButtonsOnPage1.reduce<number[]>((acc, button, i) => {
        // find expanded rows
        if (button.getAttribute('aria-label') === 'Collapse') {
          acc.push(i);
        }
        return acc;
      }, []);

      // verify 5 rows are expanded
      expect(traysOnPage1.length).toEqual(5);
      // verify 5 rows that are expanded are the ones from before
      expect(expandedButtons).toEqual([0, 2, 3, 4, 5]);
    });

    it('should read and set action type filter values using `types` URL params', async () => {
      const filterPrefix = 'types-filter';

      reactTestingLibrary.act(() => {
        history.push(`${MANAGEMENT_PATH}/response_actions_history?types=automated,manual`);
      });

      render();
      const { getAllByTestId, getByTestId } = renderResult;
      await user.click(getByTestId(`${testPrefix}-${filterPrefix}-popoverButton`));
      const allFilterOptions = getAllByTestId(`${filterPrefix}-option`);

      const selectedFilterOptions = allFilterOptions.reduce<string[]>((acc, option) => {
        if (option.getAttribute('aria-checked') === 'true') {
          acc.push(option.textContent?.split('-')[0].trim() as string);
        }
        return acc;
      }, []);

      expect(selectedFilterOptions.length).toEqual(2);
      expect(selectedFilterOptions).toEqual([
        'Triggered by rule. Checked option.',
        'Triggered manually. Checked option.',
      ]);
      expect(history.location.search).toEqual('?types=automated,manual');
    });

    it('should read and set agent type filter values using `agentTypes` URL params', async () => {
      const filterPrefix = 'types-filter';
      reactTestingLibrary.act(() => {
        history.push(`${MANAGEMENT_PATH}/response_actions_history?agentTypes=endpoint`);
      });

      render();
      const { getAllByTestId, getByTestId } = renderResult;
      await user.click(getByTestId(`${testPrefix}-${filterPrefix}-popoverButton`));
      const allFilterOptions = getAllByTestId(`${filterPrefix}-option`);

      const selectedFilterOptions = allFilterOptions.reduce<string[]>((acc, option) => {
        if (option.getAttribute('aria-checked') === 'true') {
          acc.push(option.textContent?.split('-')[0].trim() as string);
        }
        return acc;
      }, []);

      expect(selectedFilterOptions.length).toEqual(1);
      expect(selectedFilterOptions).toEqual(['Elastic Defend. Checked option.']);
      expect(history.location.search).toEqual('?agentTypes=endpoint');
    });
  });

  // TODO: These tests need revisiting, they likely time out because of slow click events after
  // the upgrade to user-event v14 (https://github.com/elastic/kibana/pull/189949)
  describe.skip('Set selected/set values to URL params', () => {
    it('should set selected page number to URL params', async () => {
      render();
      const { getByTestId } = renderResult;

      await user.click(getByTestId('pagination-button-1'));
      expect(history.location.search).toEqual('?page=2&pageSize=10');
    });

    it('should set selected pageSize value to URL params', async () => {
      render();
      const { getByTestId } = renderResult;

      await user.click(getByTestId('tablePaginationPopoverButton'));
      const pageSizeOption = getByTestId('tablePagination-20-rows');
      await user.click(pageSizeOption);

      expect(history.location.search).toEqual('?page=1&pageSize=20');
    });

    it('should set selected command filter options to URL params', async () => {
      const filterPrefix = 'actions-filter';
      render();
      const { getAllByTestId, getByTestId } = renderResult;
      await user.click(getByTestId(`${testPrefix}-${filterPrefix}-popoverButton`));
      const allFilterOptions = getAllByTestId(`${filterPrefix}-option`);

      for (const option of allFilterOptions) {
        await user.click(option);
      }

      expect(history.location.search).toEqual(
        '?commands=isolate%2Crelease%2Ckill-process%2Csuspend-process%2Cprocesses%2Cget-file%2Cexecute%2Cupload%2Cscan'
      );
    });

    it('should set selected hosts filter options to URL params ', async () => {
      const filterPrefix = 'hosts-filter';
      render();
      const { getAllByTestId, getByTestId } = renderResult;
      await user.click(getByTestId(`${testPrefix}-${filterPrefix}-popoverButton`));
      const allFilterOptions = getAllByTestId(`${filterPrefix}-option`);

      for (const [i, option] of allFilterOptions.entries()) {
        if ([0, 1, 2].includes(i)) {
          await user.click(option);
        }
      }

      expect(history.location.search).toEqual('?hosts=agent-id-0%2Cagent-id-1%2Cagent-id-2');
    });

    it('should set selected status filter options to URL params ', async () => {
      const filterPrefix = 'statuses-filter';
      render();
      const { getAllByTestId, getByTestId } = renderResult;
      await user.click(getByTestId(`${testPrefix}-${filterPrefix}-popoverButton`));
      const allFilterOptions = getAllByTestId(`${filterPrefix}-option`);

      for (const option of allFilterOptions) {
        await user.click(option);
      }

      expect(history.location.search).toEqual('?statuses=failed%2Cpending%2Csuccessful');
    });

    it('should set selected users search input strings to URL params ', async () => {
      const filterPrefix = 'users-filter';
      render();
      const { getByTestId } = renderResult;
      const usersInput = getByTestId(`${testPrefix}-${filterPrefix}-search`);
      await user.type(usersInput, '   , userX , userY, ,');
      await user.type(usersInput, '{enter}');

      expect(history.location.search).toEqual('?users=userX%2CuserY');
    });

    it('should set selected relative date range filter options to URL params ', async () => {
      const { getByTestId } = render();
      const quickMenuButton = getByTestId('superDatePickerToggleQuickMenuButton');
      const startDatePopoverButton = getByTestId(`superDatePickerShowDatesButton`);

      // shows 24 hours at first
      expect(startDatePopoverButton).toHaveTextContent('Last 24 hours');

      // pick another relative date
      await user.click(quickMenuButton);
      await waitForEuiPopoverOpen();
      await user.click(getByTestId('superDatePickerCommonlyUsed_Last_15 minutes'));
      expect(startDatePopoverButton).toHaveTextContent('Last 15 minutes');

      expect(history.location.search).toEqual('?endDate=now&startDate=now-15m');
    });

    it('should set actionIds to URL params using `withOutputs`', async () => {
      const allActionIds = mockUseGetEndpointActionList.data?.data.map((action) => action.id) ?? [];
      const actionIdsWithDetails = allActionIds
        .reduce<string[]>((acc, e, i) => {
          if ([0, 1].includes(i)) {
            acc.push(e);
          }
          return acc;
        }, [])
        .join()
        .split(',')
        .join('%2C');

      render();
      const { getAllByTestId } = renderResult;

      const expandButtons = getAllByTestId(`${testPrefix}-expand-button`);
      // expand some rows
      for (const [i, button] of expandButtons.entries()) {
        if ([0, 1].includes(i)) {
          await user.click(button);
        }
      }

      // verify 2 rows are expanded and are the ones from before
      expect(history.location.search).toEqual(`?withOutputs=${actionIdsWithDetails}`);
    });

    it('should set selected action type to URL params using `types`', async () => {
      const filterPrefix = 'types-filter';
      render();
      const { getAllByTestId, getByTestId } = renderResult;
      await user.click(getByTestId(`${testPrefix}-${filterPrefix}-popoverButton`));
      const allFilterOptions = getAllByTestId(`${filterPrefix}-option`);

      for (const option of allFilterOptions) {
        if (option.title.includes('Triggered')) {
          await user.click(option);
        }
      }

      expect(history.location.search).toEqual('?types=automated%2Cmanual');
    });

    it('should set selected agent type filter options to URL params using `agentTypes`', async () => {
      const filterPrefix = 'types-filter';
      render();
      const { getAllByTestId, getByTestId } = renderResult;
      await user.click(getByTestId(`${testPrefix}-${filterPrefix}-popoverButton`));
      const allFilterOptions = getAllByTestId(`${filterPrefix}-option`);

      for (const option of allFilterOptions) {
        if (!option.title.includes('Triggered')) {
          await user.click(option);
        }
      }

      expect(history.location.search).toEqual(
        '?agentTypes=endpoint%2Csentinel_one%2Ccrowdstrike%2Cmicrosoft_defender_endpoint'
      );
    });
  });

  // TODO: These tests need revisiting, they likely time out because of slow click events after
  // the upgrade to user-event v14 (https://github.com/elastic/kibana/pull/189949)
  describe.skip('Clear all selected options on a filter', () => {
    it('should clear all selected options on `actions` filter', async () => {
      const filterPrefix = 'actions-filter';
      render();
      const { getAllByTestId, getByTestId } = renderResult;
      await user.click(getByTestId(`${testPrefix}-${filterPrefix}-popoverButton`));
      const allFilterOptions = getAllByTestId(`${filterPrefix}-option`);

      for (const option of allFilterOptions) {
        await user.click(option);
      }

      expect(history.location.search).toEqual(
        '?commands=isolate%2Crelease%2Ckill-process%2Csuspend-process%2Cprocesses%2Cget-file%2Cexecute%2Cupload%2Cscan'
      );

      const clearAllButton = getByTestId(`${testPrefix}-${filterPrefix}-clearAllButton`);
      await user.click(clearAllButton);
      expect(history.location.search).toEqual('');
    });

    it('should clear all selected options on `hosts` filter', async () => {
      const filterPrefix = 'hosts-filter';
      render();
      const { getAllByTestId, getByTestId } = renderResult;
      await user.click(getByTestId(`${testPrefix}-${filterPrefix}-popoverButton`));
      const allFilterOptions = getAllByTestId(`${filterPrefix}-option`);

      for (const option of allFilterOptions) {
        await user.click(option);
      }

      expect(history.location.search).toEqual(
        '?hosts=agent-id-0%2Cagent-id-1%2Cagent-id-2%2Cagent-id-3%2Cagent-id-4%2Cagent-id-5%2Cagent-id-6%2Cagent-id-7%2Cagent-id-8'
      );

      const clearAllButton = getByTestId(`${testPrefix}-${filterPrefix}-clearAllButton`);
      await user.click(clearAllButton);
      expect(history.location.search).toEqual('');
    });

    it('should clear all selected options on `statuses` filter', async () => {
      const filterPrefix = 'statuses-filter';
      render();
      const { getAllByTestId, getByTestId } = renderResult;
      await user.click(getByTestId(`${testPrefix}-${filterPrefix}-popoverButton`));
      const allFilterOptions = getAllByTestId(`${filterPrefix}-option`);

      for (const option of allFilterOptions) {
        await user.click(option);
      }

      expect(history.location.search).toEqual('?statuses=failed%2Cpending%2Csuccessful');

      const clearAllButton = getByTestId(`${testPrefix}-${filterPrefix}-clearAllButton`);
      await user.click(clearAllButton);
      expect(history.location.search).toEqual('');
    });

    it('should clear `agentTypes` and `actionTypes` selected options on `types` filter', async () => {
      const filterPrefix = 'types-filter';
      render();
      const { getAllByTestId, getByTestId } = renderResult;
      await user.click(getByTestId(`${testPrefix}-${filterPrefix}-popoverButton`));
      const allFilterOptions = getAllByTestId(`${filterPrefix}-option`);

      await user.click(allFilterOptions[0]);

      for (const option of allFilterOptions) {
        await user.click(option);
      }

      expect(history.location.search).toEqual(
        '?agentTypes=endpoint%2Csentinel_one%2Ccrowdstrike%2Cmicrosoft_defender_endpoint&types=automated%2Cmanual'
      );

      const clearAllButton = getByTestId(`${testPrefix}-${filterPrefix}-clearAllButton`);
      await user.click(clearAllButton);
      expect(history.location.search).toEqual('');
    });
  });
});
