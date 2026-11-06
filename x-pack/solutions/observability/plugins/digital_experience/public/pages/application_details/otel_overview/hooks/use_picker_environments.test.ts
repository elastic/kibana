/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { ApplicationOverviewResponse } from '../../../../../common/types/overview';
import { usePickerEnvironments } from './use_picker_environments';

const response = (serviceName: string, environments: string[]) =>
  ({ overview: { serviceName }, environments } as unknown as ApplicationOverviewResponse);

const renderEnvironments = (
  serviceName: string,
  initialResponse: ApplicationOverviewResponse | undefined
) =>
  renderHook(({ name, current }) => usePickerEnvironments(name, current), {
    initialProps: { name: serviceName, current: initialResponse },
  });

describe('usePickerEnvironments', () => {
  it('has no environments until the Overview loads', () => {
    expect(renderEnvironments('shop', undefined).result.current).toBeUndefined();
  });

  it('offers the environments of the loaded Overview', () => {
    expect(renderEnvironments('shop', response('shop', ['production'])).result.current).toEqual([
      'production',
    ]);
  });

  it('keeps the last loaded environments while the next Overview loads or fails', () => {
    const { result, rerender } = renderEnvironments('shop', response('shop', ['production']));

    rerender({ name: 'shop', current: undefined });

    expect(result.current).toEqual(['production']);
  });

  it('never offers the environments of another application', () => {
    const { result, rerender } = renderEnvironments('shop', response('shop', ['production']));

    rerender({ name: 'checkout', current: response('shop', ['production']) });
    expect(result.current).toBeUndefined();

    rerender({ name: 'checkout', current: undefined });
    expect(result.current).toBeUndefined();
  });
});
