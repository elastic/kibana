/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { setMockValues, mockKibanaValues } from '../../__mocks__/kea_logic';
import { mockHistory } from '../../__mocks__/react_router';

import React from 'react';

import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';

vi.mock('./generate_breadcrumbs', async () => {
      const mocked = {
      useGenerateBreadcrumbs: (await vi.importActual('./generate_breadcrumbs')).useGenerateBreadcrumbs,
      useSearchBreadcrumbs: vi.fn(() => (crumbs: any) => crumbs),
    };
      return { ...mocked, default: mocked };
    });
import { useSearchBreadcrumbs } from './generate_breadcrumbs';

vi.mock('./generate_title', () => {
      const mocked = {
      searchTitle: vi.fn((title: any) => title),
    };
      return { ...mocked, default: mocked };
    });
import { searchTitle } from './generate_title';

import { SetSearchChrome } from '.';

describe('Set Kibana Chrome helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMockValues({ history: mockHistory });
  });

  afterEach(() => {
    expect(mockKibanaValues.setBreadcrumbs).toHaveBeenCalled();
    expect(mockKibanaValues.setDocTitle).toHaveBeenCalled();
  });

  describe('SetSearchChrome', () => {
    it('sets breadcrumbs and document title', () => {
      renderWithKibanaRenderContext(<SetSearchChrome trail={['Hello World']} />);

      expect(searchTitle).toHaveBeenCalledWith(['Hello World']);
      expect(useSearchBreadcrumbs).toHaveBeenCalledWith([
        {
          text: 'Hello World',
          path: '/current-path',
        },
      ]);
    });

    it('handles empty trails as a root-level page', () => {
      renderWithKibanaRenderContext(<SetSearchChrome />);

      expect(searchTitle).toHaveBeenCalledWith([]);
      expect(useSearchBreadcrumbs).toHaveBeenCalledWith([]);
    });
  });
});
