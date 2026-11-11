/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useAlertZeroDocumentationLink } from './use_alertzero_documentation_link';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

const mockUseKibana = jest.mocked(useKibana);

const alertZero = {
  overview: 'https://example.com/alertzero',
  setUp: 'https://example.com/alertzero/set-up',
  proposedActions: 'https://example.com/alertzero/proposed-actions',
  escalations: 'https://example.com/alertzero/escalations',
  watches: 'https://example.com/alertzero/watches',
};

describe('useAlertZeroDocumentationLink', () => {
  it.each(Object.entries(alertZero))('returns the %s documentation link', (page, url) => {
    mockUseKibana.mockReturnValue({
      services: { docLinks: { links: { securitySolution: { alertZero } } } },
    } as never);

    const { result } = renderHook(() =>
      useAlertZeroDocumentationLink(page as keyof typeof alertZero)
    );
    expect(result.current).toBe(url);
  });

  it('is undefined when docLinks is unavailable', () => {
    mockUseKibana.mockReturnValue({ services: {} } as never);

    const { result } = renderHook(() => useAlertZeroDocumentationLink('overview'));
    expect(result.current).toBeUndefined();
  });
});
