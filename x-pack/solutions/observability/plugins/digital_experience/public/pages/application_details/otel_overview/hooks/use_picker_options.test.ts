/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { OverviewFilterOptions } from '../../../../../common/overview_filters';
import type { ApplicationOverviewResponse } from '../../../../../common/types/overview';
import { usePickerOptions } from './use_picker_options';

const FILTERS: OverviewFilterOptions = {
  browser: [{ key: 'Chrome', count: 3 }],
  os: [],
  device: [],
  country: [],
  pageUrl: [],
};

const response = (serviceName: string, environments: string[]) =>
  ({
    overview: { serviceName },
    environments,
    filters: FILTERS,
  } as unknown as ApplicationOverviewResponse);

const renderOptions = (
  serviceName: string,
  initialResponse: ApplicationOverviewResponse | undefined
) =>
  renderHook(({ name, current }) => usePickerOptions(name, current), {
    initialProps: { name: serviceName, current: initialResponse },
  });

describe('usePickerOptions', () => {
  it('has no options until the Overview loads', () => {
    expect(renderOptions('shop', undefined).result.current).toBeUndefined();
  });

  it('offers the environments and filter values of the loaded Overview', () => {
    expect(renderOptions('shop', response('shop', ['production'])).result.current).toEqual({
      environments: ['production'],
      filters: FILTERS,
    });
  });

  it('keeps the last loaded options while the next Overview loads or fails', () => {
    const { result, rerender } = renderOptions('shop', response('shop', ['production']));

    rerender({ name: 'shop', current: undefined });

    expect(result.current).toMatchObject({ environments: ['production'], filters: FILTERS });
  });

  it('never offers the options of another application', () => {
    const { result, rerender } = renderOptions('shop', response('shop', ['production']));

    rerender({ name: 'checkout', current: response('shop', ['production']) });
    expect(result.current).toBeUndefined();

    rerender({ name: 'checkout', current: undefined });
    expect(result.current).toBeUndefined();
  });
});
