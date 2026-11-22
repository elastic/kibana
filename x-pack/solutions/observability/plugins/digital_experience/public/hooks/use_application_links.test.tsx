/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { renderHook } from '@testing-library/react';
import { digitalExperienceRouter } from '../routes';
import { useApplicationLinks } from './use_application_links';
import { useDigitalExperienceParams } from './use_digital_experience_params';
import { useDigitalExperienceRouter } from './use_digital_experience_router';
import { useKibanaServices } from './use_kibana_services';
import { useListQuery } from './use_list_query';
import { useSharedFilters } from './use_shared_filters';

jest.mock('./use_kibana_services');
jest.mock('./use_digital_experience_router');
jest.mock('./use_digital_experience_params');
jest.mock('./use_list_query');
jest.mock('./use_shared_filters');

const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>;

const linksFor = (listQuery: ReturnType<typeof useListQuery>) => {
  jest.mocked(useKibanaServices).mockReturnValue({
    application: { getUrlForApp: (_app: string, { path }: { path: string }) => `/app/dx${path}` },
  } as unknown as ReturnType<typeof useKibanaServices>);
  jest.mocked(useDigitalExperienceRouter).mockReturnValue(digitalExperienceRouter);
  jest
    .mocked(useDigitalExperienceParams)
    .mockReturnValue({ query: {} } as ReturnType<typeof useDigitalExperienceParams>);
  jest.mocked(useListQuery).mockReturnValue(listQuery);
  jest.mocked(useSharedFilters).mockReturnValue({});
  return renderHook(() => useApplicationLinks('my app', 'otel'), { wrapper }).result.current;
};

describe('useApplicationLinks', () => {
  describe('frustrationHref', () => {
    it('links the frustration page of the application with the time range and environment', () => {
      const { frustrationHref } = linksFor({
        rangeFrom: 'now-7d',
        rangeTo: 'now',
        environment: 'production',
      });

      expect(frustrationHref).toBe(
        '/app/dx/my%20app/frustration?environment=production&rangeFrom=now-7d&rangeTo=now&source=otel'
      );
    });

    it('has no environment when all are selected', () => {
      const { frustrationHref } = linksFor({ rangeFrom: 'now-15m', rangeTo: 'now' });

      expect(frustrationHref).toBe(
        '/app/dx/my%20app/frustration?rangeFrom=now-15m&rangeTo=now&source=otel'
      );
    });

    it('keeps the applications list filter, so the breadcrumb leads back to the same list', () => {
      const { frustrationHref } = linksFor({
        rangeFrom: 'now-15m',
        rangeTo: 'now',
        sourceFilter: 'otel',
      });

      expect(frustrationHref).toContain('sourceFilter=otel');
    });
  });
});
