/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ShallowWrapper } from 'enzyme';
import { shallow } from 'enzyme';
import React from 'react';
import { useKibana } from '../../common/lib/kibana';
import { TimelinesPage } from './timelines_page';
import { useSourcererDataView } from '../../sourcerer/containers';

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
jest.mock('../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../common/lib/kibana');

  return {
    ...originalModule,
    useKibana: jest.fn(),
  };
});

describe('TimelinesPage', () => {
  let wrapper: ShallowWrapper;

  it('should render landing page if no indicesExist', () => {
    (useSourcererDataView as unknown as jest.Mock).mockReturnValue({
      indicesExist: false,
      sourcererDataView: {},
    });
    (useKibana as unknown as jest.Mock).mockReturnValue({});

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
    (useKibana as unknown as jest.Mock).mockReturnValue({
      services: {
        application: {
          capabilities: {
            siem: {
              crud: true,
            },
          },
        },
      },
    });

    wrapper = shallow(<TimelinesPage />);

    expect(wrapper.exists('[data-test-subj="timelines-page-open-import-data"]')).toBeTruthy();
    expect(wrapper.exists('[data-test-subj="timelines-page-new"]')).toBeTruthy();
    expect(wrapper.exists('[data-test-subj="stateful-open-timeline"]')).toBeTruthy();
  });

  it('should not show import button or modal if user does not have crud authorization', () => {
    (useKibana as unknown as jest.Mock).mockReturnValue({
      services: {
        application: {
          capabilities: {
            siem: {
              crud: false,
            },
          },
        },
      },
    });

    wrapper = shallow(<TimelinesPage />);

    expect(wrapper.exists('[data-test-subj="timelines-page-open-import-data"]')).toBeFalsy();
    expect(wrapper.exists('[data-test-subj="timelines-page-new"]')).toBeFalsy();
    expect(wrapper.exists('[data-test-subj="stateful-open-timeline"]')).toBeTruthy();
  });
});
