/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook } from '@testing-library/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useAlertZeroDocumentationLink } from './use_alertzero_documentation_link';

vi.mock('@kbn/kibana-react-plugin/public', () => {
  const mocked = {
    useKibana: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const mockUseKibana = vi.mocked(useKibana);

describe('useAlertZeroDocumentationLink', () => {
  it('returns the Security solution guide link', () => {
    mockUseKibana.mockReturnValue({
      services: {
        docLinks: { links: { siem: { guide: 'https://example.com/guide' } } },
      },
    } as never);

    const { result } = renderHook(() => useAlertZeroDocumentationLink());
    expect(result.current).toBe('https://example.com/guide');
  });

  it('is undefined when docLinks is unavailable', () => {
    mockUseKibana.mockReturnValue({ services: {} } as never);

    const { result } = renderHook(() => useAlertZeroDocumentationLink());
    expect(result.current).toBeUndefined();
  });
});
