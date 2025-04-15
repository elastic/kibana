/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import * as reactTestingLibrary from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createAppRootMockRenderer,
  type AppContextTestRender,
} from '../../../../common/mock/endpoint';
import { ActionsLogUsersFilter } from './actions_log_users_filter';
import { MANAGEMENT_PATH } from '../../../../../common/constants';
import { waitFor } from '@testing-library/react';

describe('Users filter', () => {
  let render: (
    props?: React.ComponentProps<typeof ActionsLogUsersFilter>
  ) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let history: AppContextTestRender['history'];
  let mockedContext: AppContextTestRender;

  const testPrefix = 'test';
  const filterPrefix = 'users-filter';
  const delay = 100; // ms
  let onChangeUsersFilter: jest.Mock;

  beforeEach(() => {
    onChangeUsersFilter = jest.fn();
    mockedContext = createAppRootMockRenderer();
    ({ history } = mockedContext);
    render = (props?: React.ComponentProps<typeof ActionsLogUsersFilter>) =>
      (renderResult = mockedContext.render(
        <ActionsLogUsersFilter
          data-test-subj={testPrefix}
          {...{ isFlyout: false, onChangeUsersFilter }}
          {...(props ?? {})}
        />
      ));
    reactTestingLibrary.act(() => {
      history.push(`${MANAGEMENT_PATH}/response_actions`);
    });
  });

  it('should show a search input for users', () => {
    render();

    const searchInput = renderResult.getByTestId(`${testPrefix}-${filterPrefix}-search`);
    expect(searchInput).toBeTruthy();
    expect(searchInput.getAttribute('placeholder')).toEqual('Filter by username');
  }, 10000);

  it('should search on given search string on enter', async () => {
    render();

    const searchInput = renderResult.getByTestId(`${testPrefix}-${filterPrefix}-search`);
    await userEvent.type(searchInput, 'usernameX', { delay });
    await userEvent.keyboard('{enter}');
    await waitFor(() => expect(onChangeUsersFilter).toHaveBeenCalledWith(['usernameX']));
  }, 10000);

  it('should search comma separated strings as multiple users', async () => {
    render();

    const searchInput = renderResult.getByTestId(`${testPrefix}-${filterPrefix}-search`);
    await userEvent.type(searchInput, 'usernameX,usernameY,usernameZ', { delay });
    await userEvent.keyboard('{enter}');
    await waitFor(() =>
      expect(onChangeUsersFilter).toHaveBeenCalledWith(['usernameX', 'usernameY', 'usernameZ'])
    );
  }, 15000);

  it('should ignore white spaces in a given username when updating the API params', async () => {
    render();

    const searchInput = renderResult.getByTestId(`${testPrefix}-${filterPrefix}-search`);
    await userEvent.type(searchInput, '   usernameX   ', { delay });
    await userEvent.keyboard('{enter}');
    await waitFor(() => expect(onChangeUsersFilter).toHaveBeenCalledWith(['usernameX']));
  }, 10000);

  it('should ignore white spaces in comma separated usernames when updating the API params', async () => {
    render();

    const searchInput = renderResult.getByTestId(`${testPrefix}-${filterPrefix}-search`);
    await userEvent.type(searchInput, '   , usernameX ,usernameY    ,       ', { delay });
    await userEvent.keyboard('{enter}');
    await waitFor(() =>
      expect(onChangeUsersFilter).toHaveBeenCalledWith(['usernameX', 'usernameY'])
    );
  }, 15000);
});
