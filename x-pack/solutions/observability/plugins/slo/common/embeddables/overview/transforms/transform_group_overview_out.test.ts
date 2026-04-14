/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OverviewEmbeddableState } from '../../../../server/lib/embeddables/schema';
import { transformGroupOverviewOut } from './transform_group_overview_out';

describe('transformGroupOverviewOut', () => {
  it('should transform legacy camelCase state to new snake_case format', () => {
    expect(
      transformGroupOverviewOut({
        overviewMode: 'groups',
        groupFilters: {
          groupBy: 'slo.tags',
          groups: ['tag1', 'tag2'],
          kqlQuery: 'status: healthy',
        },
        title: 'Test Group Title',
      } as unknown as OverviewEmbeddableState)
    ).toMatchInlineSnapshot(`
      Object {
        "group_filters": Object {
          "group_by": "slo.tags",
          "groups": Array [
            "tag1",
            "tag2",
          ],
          "kql_query": "status: healthy",
        },
        "overview_mode": "groups",
        "title": "Test Group Title",
      }
    `);
  });

  it('should return state unchanged when no legacy fields are present', () => {
    expect(
      transformGroupOverviewOut({
        overview_mode: 'groups',
        group_filters: {
          group_by: 'status',
          groups: ['violated'],
          kql_query: 'my-kql-query',
        },
      })
    ).toMatchInlineSnapshot(`
      Object {
        "group_filters": Object {
          "group_by": "status",
          "groups": Array [
            "violated",
          ],
          "kql_query": "my-kql-query",
        },
        "overview_mode": "groups",
      }
    `);
  });

  it('should default group_by to "status" when legacy groupFilters has no groupBy', () => {
    expect(
      transformGroupOverviewOut({
        overviewMode: 'groups',
        groupFilters: {},
      } as unknown as OverviewEmbeddableState)
    ).toMatchInlineSnapshot(`
      Object {
        "group_filters": Object {
          "group_by": "status",
        },
        "overview_mode": "groups",
      }
    `);
  });

  it('should transform legacy groupFilters with only groupBy', () => {
    expect(
      transformGroupOverviewOut({
        overviewMode: 'groups',
        groupFilters: {
          groupBy: 'slo.indicator.type',
        },
      } as unknown as OverviewEmbeddableState)
    ).toMatchInlineSnapshot(`
      Object {
        "group_filters": Object {
          "group_by": "slo.indicator.type",
        },
        "overview_mode": "groups",
      }
    `);
  });

  it('should transform legacy filters using fromStoredFilters', () => {
    expect(
      transformGroupOverviewOut({
        overviewMode: 'groups',
        groupFilters: {
          groupBy: 'slo.tags',
          filters: [
            {
              meta: {
                type: 'phrase',
                key: 'status',
                params: { query: 'healthy' },
              },
              query: { match_phrase: { status: { query: 'healthy' } } },
            },
          ],
        },
      } as unknown as OverviewEmbeddableState)
    ).toMatchInlineSnapshot(`
      Object {
        "group_filters": Object {
          "filters": Array [
            Object {
              "condition": Object {
                "field": "status",
                "operator": "is",
                "value": "healthy",
              },
              "type": "condition",
            },
          ],
          "group_by": "slo.tags",
        },
        "overview_mode": "groups",
      }
    `);
  });

  it('should preserve groups array in transformed output', () => {
    const groups = ['healthy', 'degraded', 'no_data'];

    expect(
      transformGroupOverviewOut({
        overviewMode: 'groups',
        groupFilters: { groupBy: 'status', groups },
      } as unknown as OverviewEmbeddableState)
    ).toMatchObject({
      group_filters: {
        groups,
      },
    });
  });

  it('should transform kql_query from legacy format', () => {
    const kqlQuery = 'slo.indicator.type: "sli.apm.transactionErrorRate"';

    expect(
      transformGroupOverviewOut({
        overviewMode: 'groups',
        groupFilters: { groupBy: 'status', kqlQuery },
      } as unknown as OverviewEmbeddableState)
    ).toMatchObject({
      group_filters: {
        kql_query: kqlQuery,
      },
    });
  });
});
