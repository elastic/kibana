/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, waitFor } from '@testing-library/react';
import { EndpointScriptFlyout, type EndpointScriptFlyoutProps } from './script_flyout';
import { EndpointScriptsGenerator } from '../../../../../../../common/endpoint/data_generators/endpoint_scripts_generator';
import {
  createAppRootMockRenderer,
  type AppContextTestRender,
} from '../../../../../../common/mock/endpoint';
import { useGetEndpointScript } from '../../../../../hooks/script_library';

jest.mock('../../../../../hooks/script_library/use_get_script_by_id');

describe('EndpointScriptFlyout', () => {
  let render: (props?: EndpointScriptFlyoutProps) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;
  let scriptsGenerator: EndpointScriptsGenerator;
  const defaultProps: EndpointScriptFlyoutProps = {
    queryParams: {
      page: 1,
      pageSize: 10,
      sortField: 'name',
      sortDirection: 'asc',
    },
    onCloseFlyout: jest.fn(),
    onClickAction: jest.fn(),
    onSuccess: jest.fn(),
    show: 'details',
    'data-test-subj': 'test',
  };

  const defaultGetScriptHookReturn = {
    isRefetching: false,
    error: null,
    refetch: jest.fn(),
  };

  beforeEach(() => {
    scriptsGenerator = new EndpointScriptsGenerator('script-flyout-test');
    mockedContext = createAppRootMockRenderer();

    (useGetEndpointScript as jest.Mock).mockReturnValue(defaultGetScriptHookReturn);

    defaultProps.scriptItem = scriptsGenerator.generate({
      id: 'script-1',
      name: 'Script snippet',
      platform: ['linux', 'macos'],
      updatedBy: 'elastic',
      updatedAt: '2026-02-04T12:23:37Z',
    });

    render = (props?: EndpointScriptFlyoutProps) => {
      renderResult = mockedContext.render(<EndpointScriptFlyout {...(props ?? defaultProps)} />);
      return renderResult;
    };
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should render correctly', () => {
    render();
    expect(renderResult.queryByTestId('test')).toBeTruthy();
  });

  it('should render loading state when `scriptItem` is not provided', () => {
    (useGetEndpointScript as jest.Mock).mockImplementation(() => ({
      ...defaultGetScriptHookReturn,
      isRefetching: true,
    }));
    act(() => {
      render({ ...defaultProps, scriptItem: undefined });
    });
    expect(renderResult.getByTestId('test-loading-header')).toBeInTheDocument();
  });

  it('should show script details when show is `details`', () => {
    render({ ...defaultProps, show: 'details', 'data-test-subj': 'test-details' });
    expect(renderResult.getByTestId('test-details-header')).toBeInTheDocument();
  });

  it.each(['create', 'edit'])('should show script edit form when show is `%s`', (show) => {
    act(() => {
      // @ts-ignore type checks for show
      render({ ...defaultProps, show, 'data-test-subj': `test-${show}` });
    });
    expect(renderResult.getByTestId(`test-${show}-header`)).toBeInTheDocument();
  });

  it('should call onCloseFlyout when flyout is closed', () => {
    render();
    const { getByTestId, queryByTestId } = renderResult;
    const flyout = getByTestId('test');
    expect(flyout).toBeInTheDocument();

    getByTestId('euiFlyoutCloseButton').click();
    expect(defaultProps.onCloseFlyout).toHaveBeenCalled();
    waitFor(() => {
      expect(queryByTestId('test')).not.toBeInTheDocument();
    });
  });

  it.each(['details', 'edit'])('should fetch script data when needed for `%s`', (show) => {
    const scriptData = scriptsGenerator.generate();
    const refetchMock = jest.fn().mockResolvedValue({ data: scriptData });
    (useGetEndpointScript as jest.Mock).mockImplementation(() => ({
      ...defaultGetScriptHookReturn,
      refetch: refetchMock,
    }));
    act(() => {
      // @ts-ignore type checks for show
      render({ ...defaultProps, show, scriptItem: undefined });
    });
    expect(refetchMock).toHaveBeenCalled();
  });

  it('should not fetch script data when show is `create`', () => {
    const refetchMock = jest.fn();
    (useGetEndpointScript as jest.Mock).mockImplementation(() => ({
      ...defaultGetScriptHookReturn,
      refetch: refetchMock,
    }));
    act(() => {
      render({ ...defaultProps, show: 'create', scriptItem: undefined });
    });
    expect(refetchMock).not.toHaveBeenCalled();
  });
});
