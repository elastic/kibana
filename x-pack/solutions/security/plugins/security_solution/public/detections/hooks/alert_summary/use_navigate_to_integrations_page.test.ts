/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import {
  INTEGRATIONS_URL,
  useNavigateToIntegrationsPage,
} from './use_navigate_to_integrations_page';
import { useKibana, useNavigateTo } from '../../../common/lib/kibana';

jest.mock('../../../common/lib/kibana');

describe('useNavigateToIntegrationsPage', () => {
  it('should return function', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        http: {
          basePath: {
            prepend: jest.fn().mockImplementation((url) => url),
          },
        },
      },
    });
    const navigateTo = jest.fn();
    (useNavigateTo as jest.Mock).mockReturnValue({ navigateTo });

    const { result } = renderHook(() => useNavigateToIntegrationsPage());

    expect(typeof result.current).toBe('function');
    result.current();
    expect(navigateTo).toHaveBeenCalledWith({
      url: INTEGRATIONS_URL,
    });
  });
});
