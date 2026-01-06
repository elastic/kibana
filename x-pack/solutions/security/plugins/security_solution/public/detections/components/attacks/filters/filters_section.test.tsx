/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';
import { TestProviders } from '../../../../common/mock';
import type { DataView } from '@kbn/data-views-plugin/common';
import { FiltersSection } from './filters_section';
import { useSpaceId } from '../../../../common/hooks/use_space_id';

jest.mock('../../../../common/hooks/use_space_id');

const dataView: DataView = createStubDataView({ spec: {} });

describe('FiltersSection', () => {
  it('should render correctly', () => {
    (useSpaceId as jest.Mock).mockReturnValue('default');

    render(
      <TestProviders>
        <FiltersSection
          pageFilters={[]}
          dataView={dataView}
          setPageFilterHandler={jest.fn()}
          setPageFilters={jest.fn()}
          setStatusFilter={jest.fn()}
        />
      </TestProviders>
    );

    expect(screen.getByTestId('filter-group__loading')).toBeInTheDocument();
  });

  it('should not render anything', () => {
    (useSpaceId as jest.Mock).mockReturnValue(null);

    const { container } = render(
      <TestProviders>
        <FiltersSection
          pageFilters={[]}
          dataView={dataView}
          setPageFilterHandler={jest.fn()}
          setPageFilters={jest.fn()}
          setStatusFilter={jest.fn()}
        />
      </TestProviders>
    );

    expect(container).toBeEmptyDOMElement();
  });
});
