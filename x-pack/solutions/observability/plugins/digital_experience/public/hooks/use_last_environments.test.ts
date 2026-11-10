/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useLastEnvironments } from './use_last_environments';

interface Props {
  serviceName: string;
  response: { serviceName: string; environments: string[] } | undefined;
}

const renderEnvironments = (initialProps: Props) => {
  return renderHook(
    ({ serviceName, response }: Props) => {
      return useLastEnvironments(serviceName, response);
    },
    { initialProps }
  );
};

const SHOP = { serviceName: 'shop', environments: ['production', 'staging'] };

describe('useLastEnvironments', () => {
  it('returns undefined until a response of the application has loaded', () => {
    const { result } = renderEnvironments({ serviceName: 'shop', response: undefined });

    expect(result.current).toBeUndefined();
  });

  it('returns the environments of the current response', () => {
    const { result } = renderEnvironments({ serviceName: 'shop', response: SHOP });

    expect(result.current).toEqual(['production', 'staging']);
  });

  it('keeps the last environments while the next response loads or fails', () => {
    const { result, rerender } = renderEnvironments({ serviceName: 'shop', response: SHOP });

    rerender({ serviceName: 'shop', response: undefined });

    expect(result.current).toEqual(['production', 'staging']);
  });

  it("never returns another application's environments", () => {
    const { result, rerender } = renderEnvironments({ serviceName: 'shop', response: SHOP });

    rerender({ serviceName: 'docs', response: undefined });
    expect(result.current).toBeUndefined();

    rerender({ serviceName: 'docs', response: SHOP });
    expect(result.current).toBeUndefined();
  });
});
