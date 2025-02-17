/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import React from 'react';
import { TimelinesPage } from './timelines_page';
import { useDataView } from '../../data_view_picker/hooks/use_data_view';
import { useUserPrivileges } from '../../common/components/user_privileges';
import { TestProviders } from '../../common/mock';

jest.mock('react-router-dom', () => {
  const originalModule = jest.requireActual('react-router-dom');

  return {
    ...originalModule,
    useParams: jest.fn().mockReturnValue({
      tabName: 'default',
    }),
  };
});
jest.mock('../../overview/components/events_by_dataset');
jest.mock('../../common/components/user_privileges');
jest.mock('../../data_view_picker/hooks/use_data_view');

jest.mock('../../common/components/security_route_page_wrapper', () => ({
  SecurityRoutePageWrapper: (props: PropsWithChildren<{}>) => <>{props.children}</>,
}));
jest.mock('../components/open_timeline', () => ({
  StatefulOpenTimeline: () => <div data-test-subj="stateful-open-timeline" />,
}));

describe('TimelinesPage', () => {
  it('should render landing page if no indicesExist', () => {
    jest.mocked(useDataView).mockReturnValue({
      indicesExist: false,
      dataView: {},
      status: 'ready',
    });
    (useUserPrivileges as jest.Mock).mockReturnValue({
      timelinePrivileges: {
        crud: true,
      },
    });

    const wrapper = render(<TimelinesPage />, { wrapper: TestProviders });

    expect(wrapper.queryByTestId('timelines-page-open-import-data')).toBeFalsy();
    expect(wrapper.queryByTestId('timelines-page-new')).toBeFalsy();
    expect(wrapper.queryByTestId('stateful-open-timeline')).toBeFalsy();
  });

  it('should show the correct elements if user has crud', () => {
    jest.mocked(useDataView).mockReturnValue({
      indicesExist: true,
      dataView: {},
      status: 'ready',
    });
    (useUserPrivileges as jest.Mock).mockReturnValue({
      timelinePrivileges: {
        crud: true,
      },
    });

    const wrapper = render(<TimelinesPage />, { wrapper: TestProviders });

    expect(wrapper.queryByTestId('timelines-page-open-import-data')).toBeTruthy();
    expect(wrapper.queryByTestId('timelines-page-new')).toBeTruthy();
    expect(wrapper.queryByTestId('stateful-open-timeline')).toBeTruthy();
  });

  it('should not show import button or modal if user does not have crud privileges but it should show the new timeline button', () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      timelinePrivileges: {
        crud: false,
        read: true,
      },
    });

    const wrapper = render(<TimelinesPage />, { wrapper: TestProviders });

    expect(wrapper.queryByTestId('timelines-page-open-import-data')).toBeFalsy();
    expect(wrapper.queryByTestId('timelines-page-new')).toBeTruthy();
    expect(wrapper.queryByTestId('stateful-open-timeline')).toBeTruthy();
  });
});
