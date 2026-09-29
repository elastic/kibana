/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useExportList } from '@kbn/securitysolution-list-hooks';
import * as Api from '@kbn/securitysolution-list-api';
import { httpServiceMock } from '@kbn/core/public/mocks';

vi.mock('@kbn/securitysolution-list-api');

// TODO: Move this test to the kbn package: x-pack/solutions/security/packages/kbn-securitysolution-list-hooks/src/use_export_list/index.ts once Mocks are ported from Kibana

describe('useExportList', () => {
  let httpMock: ReturnType<typeof httpServiceMock.createStartContract>;

  beforeEach(() => {
    httpMock = httpServiceMock.createStartContract();
    (Api.exportList as Mock).mockResolvedValue(new Blob());
  });

  it('invokes Api.exportList', async () => {
    const { result } = renderHook(() => useExportList());
    act(() => {
      result.current.start({ http: httpMock, listId: 'list' });
    });
    await waitFor(() =>
      expect(Api.exportList).toHaveBeenCalledWith(
        expect.objectContaining({ http: httpMock, listId: 'list' })
      )
    );
  });
});
