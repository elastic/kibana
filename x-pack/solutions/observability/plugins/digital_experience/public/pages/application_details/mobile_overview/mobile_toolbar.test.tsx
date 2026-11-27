/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import type { MobileKpisResponse } from '../../../../common/types/mobile';
import { FacetFilter } from '../../../components/facet_filter';
import { useFormatters } from '../../../hooks/use_formatters';
import { useQueryParam } from '../../../hooks/use_query_param';
import { MobileToolbar } from './mobile_toolbar';

jest.mock('../../../hooks/use_formatters');
jest.mock('../../../hooks/use_query_param');
jest.mock('../../../components/facet_filter', () => ({ FacetFilter: jest.fn(() => null) }));
jest.mock('../../../components/application_tab_toolbar', () => ({
  ApplicationTabToolbar: ({ filters }: { filters: ReactNode }) => <>{filters}</>,
}));

const KPIS = {
  releases: [{ key: '8.5.0', count: 40 }],
  osNames: [{ key: 'iOS', count: 40 }],
} as unknown as MobileKpisResponse;

const releaseFilterProps = () =>
  jest
    .mocked(FacetFilter)
    .mock.calls.map(([props]) => props)
    .filter((props) => props['data-test-subj'] === 'digitalExperienceMobileReleaseFilter')
    .at(-1);

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useFormatters).mockReturnValue({} as ReturnType<typeof useFormatters>);
  jest.mocked(useQueryParam).mockReturnValue({ value: undefined, setValue: jest.fn() });
});

describe('MobileToolbar', () => {
  it("lists the KPIs' releases by default", () => {
    render(<MobileToolbar kpis={KPIS} isLoading={false} onRefresh={jest.fn()} />);

    expect(releaseFilterProps()).toEqual(
      expect.objectContaining({ buckets: KPIS.releases, isLoading: false })
    );
  });

  it("lists a tab's own releases instead", () => {
    const buckets = [{ key: '8.4.0', count: 1 }];
    render(
      <MobileToolbar
        kpis={KPIS}
        releaseOptions={{ buckets }}
        isLoading={false}
        onRefresh={jest.fn()}
      />
    );

    expect(releaseFilterProps()).toEqual(expect.objectContaining({ buckets }));
  });

  it("never falls back to the KPIs' releases while a tab's own load, or when they fail", () => {
    const { rerender } = render(
      <MobileToolbar
        kpis={KPIS}
        releaseOptions={{ buckets: undefined }}
        isLoading
        onRefresh={jest.fn()}
      />
    );
    expect(releaseFilterProps()).toEqual(expect.objectContaining({ buckets: [], isLoading: true }));

    rerender(
      <MobileToolbar
        kpis={KPIS}
        releaseOptions={{ buckets: undefined }}
        isLoading={false}
        onRefresh={jest.fn()}
      />
    );
    expect(releaseFilterProps()).toEqual(
      expect.objectContaining({ buckets: [], isLoading: false })
    );
  });
});
