/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { render } from '@testing-library/react';
import type { DetectionEngineFiltersProps } from './detection_engine_filters';
import { DetectionEngineFilters } from './detection_engine_filters';
import * as alertFilterControlsPackage from '@kbn/alerts-ui-shared/src/alert_filter_controls/alert_filter_controls';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { URL_PARAM_KEY } from '../../../common/hooks/use_url_state';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public/state_sync/state_sync_state_storage/create_kbn_url_state_storage';

jest.mock('@kbn/alerts-ui-shared/src/alert_filter_controls/alert_filter_controls');
jest.mock(
  '@kbn/kibana-utils-plugin/public/state_sync/state_sync_state_storage/create_kbn_url_state_storage'
);
jest.mock('../../../common/hooks/use_space_id');

const stubSecurityDataView = createStubDataView({
  spec: {
    id: 'security',
    title: 'security',
  },
});

const mockDataViewsService = {
  ...dataViewPluginMocks.createStartContract(),
  get: () => Promise.resolve(stubSecurityDataView),
  clearInstanceCache: () => Promise.resolve(),
};

jest.mock('../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../common/lib/kibana');

  return {
    ...original,
    useUiSetting$: jest.fn().mockReturnValue([]),
    useKibana: () => ({
      services: {
        dataViews: mockDataViewsService,
        notifications: {
          toasts: {
            addWarning: jest.fn(),
            addError: jest.fn(),
            addSuccess: jest.fn(),
            addDanger: jest.fn(),
            remove: jest.fn(),
          },
        },
      },
    }),
  };
});

jest
  .spyOn(alertFilterControlsPackage, 'AlertFilterControls')
  .mockImplementation(() => <span data-test-subj="filter-group__loading" />);

describe('DetectionEngineFilters', () => {
  const mockProps: Partial<DetectionEngineFiltersProps> = {
    filters: [],
    onFiltersChange: jest.fn(),
    query: {
      query: '',
      language: 'kql',
    },
    timeRange: { from: 'now-15m', to: 'now' },
    onInit: jest.fn(),
    dataViewSpec: {
      title: 'mock-title',
      fields: {},
    },
  };

  const set = jest.fn();
  const get = jest.fn();

  beforeAll(() => {
    (createKbnUrlStateStorage as jest.Mock).mockReturnValue({
      set,
      get,
    });
  });

  beforeEach(() => {
    (useSpaceId as jest.Mock).mockReturnValue('default');
  });

  it('renders null if a spaceId is missing', () => {
    (useSpaceId as jest.Mock).mockReturnValue(undefined);
    const { container } = render(<DetectionEngineFilters {...mockProps} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders correctly when spaceId and dataViewSpec are defined', () => {
    const { container } = render(<DetectionEngineFilters {...mockProps} />);
    expect(container).toBeInTheDocument();
  });

  it('persists the filter control configuration to the url', async () => {
    const controlsConfig = [
      {
        title: 'Status',
        fieldName: 'kibana.alert.workflow_status',
        selectedOptions: ['open'],
        hideActionBar: true,
        persist: true,
        hideExists: true,
      },
    ];
    jest
      .spyOn(alertFilterControlsPackage, 'AlertFilterControls')
      .mockImplementationOnce((props) => {
        useEffect(() => {
          props.setControlsUrlState!(controlsConfig);
        }, [props.setControlsUrlState]);
        return <span />;
      });

    render(<DetectionEngineFilters {...mockProps} />);

    expect(set).toHaveBeenCalledWith(URL_PARAM_KEY.pageFilter, controlsConfig);
  });
});
