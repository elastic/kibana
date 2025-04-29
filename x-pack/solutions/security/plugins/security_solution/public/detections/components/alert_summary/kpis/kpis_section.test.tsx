/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { KPIsSection } from './kpis_section';
import { ALERTS_BY_HOST_PANEL } from './alerts_progress_bar_by_host_name_panel';
import type { DataView } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';
import { TestProviders } from '../../../../common/mock';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';

jest.mock('../../../../common/hooks/use_selector');

const dataView: DataView = createStubDataView({ spec: {} });

describe('<KPIsSection />', () => {
  it('should render all components', async () => {
    (useDeepEqualSelector as jest.Mock).mockReturnValue({
      meta: {},
    });

    const { getByTestId } = render(
      <TestProviders>
        <KPIsSection dataView={dataView} />
      </TestProviders>
    );

    expect(getByTestId('severty-level-panel')).toBeInTheDocument();
    expect(getByTestId('alerts-by-rule-panel')).toBeInTheDocument();
    expect(getByTestId(ALERTS_BY_HOST_PANEL)).toBeInTheDocument();
  });
});
