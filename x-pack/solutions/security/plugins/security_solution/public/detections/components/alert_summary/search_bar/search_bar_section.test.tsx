/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import { installationStatuses } from '@kbn/fleet-plugin/common/constants';
import { SEARCH_BAR_TEST_ID, SearchBarSection } from './search_bar_section';
import type { DataView } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';
import { INTEGRATION_BUTTON_TEST_ID } from './integrations_filter_button';
import { useKibana } from '../../../../common/lib/kibana';
import { useIntegrations } from '../../../hooks/alert_summary/use_integrations';

vi.mock('../../../../common/components/search_bar', () => {
      const mocked = {
      // The module factory of `jest.mock()` is not allowed to reference any out-of-scope variables so we can't use SEARCH_BAR_TEST_ID
      SiemSearchBar: () => <div data-test-subj={'alert-summary-search-bar'} />,
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../../common/lib/kibana');
vi.mock('../../../hooks/alert_summary/use_integrations');

const dataView: DataView = createStubDataView({ spec: {} });
const packages: PackageListItem[] = [
  {
    id: 'splunk',
    name: 'splunk',
    status: installationStatuses.Installed,
    title: 'Splunk',
    version: '',
  },
];

describe('<SearchBarSection />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all components', () => {
    (useIntegrations as Mock).mockReturnValue({
      isLoading: false,
      integrations: [],
    });
    (useKibana as Mock).mockReturnValue({
      services: { data: { query: { filterManager: vi.fn() } } },
    });

    const { getByTestId } = render(<SearchBarSection dataView={dataView} packages={packages} />);

    expect(getByTestId(SEARCH_BAR_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(INTEGRATION_BUTTON_TEST_ID)).toBeInTheDocument();
  });
});
