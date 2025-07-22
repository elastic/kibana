/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ShallowWrapper } from 'enzyme';
import { shallow } from 'enzyme';
import React from 'react';
import { TimelinesPage } from './timelines_page';
import { useSourcererDataView } from '../../sourcerer/containers';
import { useUserPrivileges } from '../../common/components/user_privileges';

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
jest.mock('../../sourcerer/containers');
jest.mock('../../common/components/user_privileges');
jest.mock('../../data_view_manager/hooks/use_data_view', () => ({
  useDataView: jest.fn(() => ({ dataView: { matchedIndices: [] } })),
}));
jest.mock('../../common/hooks/use_experimental_features');

describe('TimelinesPage', () => {
  let wrapper: ShallowWrapper;

  it('should render landing page if no indicesExist', () => {
    (useSourcererDataView as unknown as jest.Mock).mockReturnValue({
      indicesExist: false,
      sourcererDataView: {},
    });
    (useUserPrivileges as jest.Mock).mockReturnValue({
      timelinePrivileges: {
        crud: true,
      },
    });

    wrapper = shallow(<TimelinesPage />);

    expect(wrapper.exists('[data-test-subj="timelines-page-open-import-data"]')).toBeFalsy();
    expect(wrapper.exists('[data-test-subj="timelines-page-new"]')).toBeFalsy();
    expect(wrapper.exists('[data-test-subj="stateful-open-timeline"]')).toBeFalsy();
  });

  it('should show the correct elements if user has crud', () => {
    (useSourcererDataView as unknown as jest.Mock).mockReturnValue({
      indicesExist: true,
      sourcererDataView: {},
    });
    (useUserPrivileges as jest.Mock).mockReturnValue({
      timelinePrivileges: {
        crud: true,
      },
    });

    wrapper = shallow(<TimelinesPage />);

    expect(wrapper.exists('[data-test-subj="timelines-page-open-import-data"]')).toBeTruthy();
    expect(wrapper.exists('[data-test-subj="timelines-page-new"]')).toBeTruthy();
    expect(wrapper.exists('[data-test-subj="stateful-open-timeline"]')).toBeTruthy();
  });

  it('should not show import button or modal if user does not have crud privileges but it should show the new timeline button', () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      timelinePrivileges: {
        crud: false,
        read: true,
      },
    });

    wrapper = shallow(<TimelinesPage />);

    expect(wrapper.exists('[data-test-subj="timelines-page-open-import-data"]')).toBeFalsy();
    expect(wrapper.exists('[data-test-subj="timelines-page-new"]')).toBeTruthy();
    expect(wrapper.exists('[data-test-subj="stateful-open-timeline"]')).toBeTruthy();
  });
});
