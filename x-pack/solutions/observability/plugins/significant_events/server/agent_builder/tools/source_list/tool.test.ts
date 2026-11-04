/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NightshiftFeaturePrivilege } from '../../utils/test_helpers';
import {
  createMockToolContext,
  createSourceToolDeps,
  sourceWithSlug,
} from '../../utils/test_helpers';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import { createSourceListTool } from './tool';

jest.mock('../../../routes/utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn(),
}));

describe('source_list tool', () => {
  const createTool = ({
    featurePrivilege,
    list = jest.fn(),
  }: {
    featurePrivilege: NightshiftFeaturePrivilege;
    list?: jest.Mock;
  }) =>
    createSourceListTool({
      ...createSourceToolDeps({ featurePrivilege, sourcesClient: { list } }),
    });

  beforeEach(() => {
    jest.mocked(assertSignificantEventsAccess).mockReset().mockResolvedValue(undefined);
  });

  it('lists every source of the space, whatever its enabled state', async () => {
    const list = jest.fn().mockResolvedValue({
      sources: [
        sourceWithSlug('nginx-errors', { esql: 'FROM logs-nginx-*', type: 'logs' }),
        sourceWithSlug('disabled-source', { enabled: false }),
      ],
      total: 4,
      page: 1,
      per_page: 2,
    });
    const tool = createTool({ featurePrivilege: 'read', list });

    const result = await tool.handler(
      { search: 'n', enabled: undefined, page: 1, per_page: 2 },
      createMockToolContext()
    );

    expect(list).toHaveBeenCalledWith({ page: 1, perPage: 2, search: 'n', enabled: undefined });
    expect(result).toEqual({
      results: [
        {
          type: 'other',
          data: {
            total: 4,
            page: 1,
            per_page: 2,
            sources: [
              expect.objectContaining({
                id: 'nginx-errors',
                slug: 'nginx-errors',
                title: 'nginx-errors',
                esql: 'FROM logs-nginx-*',
                enabled: true,
              }),
              expect.objectContaining({ slug: 'disabled-source', enabled: false }),
            ],
          },
        },
      ],
    });
  });

  it('does not list sources without the Nightshift read privilege', async () => {
    const list = jest.fn();
    const tool = createTool({ featurePrivilege: 'none', list });

    const result = await tool.handler({ page: 1, per_page: 100 }, createMockToolContext());

    expect(list).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      results: [
        {
          type: 'error',
          data: { message: expect.stringContaining('requires the Nightshift read privilege') },
        },
      ],
    });
  });
});
