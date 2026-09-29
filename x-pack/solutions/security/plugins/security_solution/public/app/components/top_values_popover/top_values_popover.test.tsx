/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { waitFor, render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../common/mock';
import { TopValuesPopover } from './top_values_popover';

vi.mock('../../../common/components/visualization_actions/lens_embeddable');
vi.mock('react-router-dom', () => {
  const original = require('react-router-dom');
  return {
    ...original,
    useLocation: vi.fn().mockReturnValue({ pathname: '/test' }),
  };
});
vi.mock('../../../data_view_manager/hooks/use_data_view');

const element = document.createElement('button');
document.body.appendChild(element);

const data = {
  fieldName: 'user.name',
  nodeRef: element,
};

const mockUseObservable = vi.fn();

vi.mock('react-use/lib/useObservable', () => ({ default: () => mockUseObservable() }));

vi.mock('../../../common/lib/kibana', async () => {
  const original = await vi.importActual('../../../common/lib/kibana');
  return {
    ...original,
    useKibana: () => ({
      ...original.useKibana(),
      services: {
        ...original.useKibana().services,
        topValuesPopover: { getObservable: vi.fn() },
      },
    }),
  };
});

describe('TopNAction', () => {
  it('renders', async () => {
    mockUseObservable.mockReturnValue(data);

    const { queryByTestId } = render(<TopValuesPopover />, {
      wrapper: TestProviders,
    });

    await waitFor(() => {
      expect(queryByTestId('topN-container')).toBeInTheDocument();
    });
  });

  it('does not render when nodeRef is null', async () => {
    mockUseObservable.mockReturnValue({ ...data, nodeRef: undefined });

    const { queryByTestId } = render(<TopValuesPopover />, {
      wrapper: TestProviders,
    });

    await waitFor(() => {
      expect(queryByTestId('topN-container')).not.toBeInTheDocument();
    });
  });

  it('does not render when data is undefined', async () => {
    mockUseObservable.mockReturnValue(undefined);

    const { queryByTestId } = render(<TopValuesPopover />, {
      wrapper: TestProviders,
    });

    await waitFor(() => {
      expect(queryByTestId('topN-container')).not.toBeInTheDocument();
    });
  });
});
