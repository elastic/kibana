/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { of } from 'rxjs';
import React from 'react';
import { useObservabilityDocsLinks } from './observability_docs_links';

const mockServices = {
  docLinks: { links: { observability: { guide: 'https://docs.example/o11y' } } },
  chrome: { getHelpSupportUrl$: () => of('https://support.example/hub') },
};

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({ services: mockServices }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => <>{children}</>;

describe('useObservabilityDocsLinks', () => {
  it('builds the four links with resolved destinations', () => {
    const { result } = renderHook(() => useObservabilityDocsLinks(), { wrapper });
    expect(result.current.map(({ id }) => id)).toEqual([
      'demo',
      'forum',
      'documentation',
      'support',
    ]);
    expect(result.current[2].href).toBe('https://docs.example/o11y');
    expect(result.current[3].href).toBe('https://support.example/hub');
  });
});
