/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import { spaceTest, tags } from '../fixtures';
import { seedEndpointHosts, type SeededEndpointHosts } from '../../common/seed_endpoint_hosts';
import { PARALLEL_HOST_SEED_TIMEOUT_MS } from '../../common/get_file_spec_helpers';
import { HOST_METADATA_LIST_ROUTE } from '../../../../../common/endpoint/constants';
import { EndpointSortableField } from '../../../../../common/endpoint/types';

// enrolled_at is only the default sort; it has no column.
const SORTABLE_COLUMNS = Object.values(EndpointSortableField).filter(
  (field) => field !== EndpointSortableField.ENROLLED_AT
);

/** Waits for the next endpoint list response; with `sort`, only one requested with that sort. */
const waitForEndpointList = (
  page: ScoutPage,
  sort?: { field: string; direction: 'asc' | 'desc' }
): ReturnType<ScoutPage['waitForResponse']> =>
  page.waitForResponse((response) => {
    const url = new URL(response.url());
    if (!url.pathname.endsWith(HOST_METADATA_LIST_ROUTE)) {
      return false;
    }
    return (
      !sort ||
      (url.searchParams.get('sortField') === sort.field &&
        url.searchParams.get('sortDirection') === sort.direction)
    );
  });

spaceTest.describe('Endpoint list sorting', { tag: tags.stateful.classic }, () => {
  let seeded: SeededEndpointHosts | undefined;

  spaceTest.beforeAll(async ({ esClient, kbnClient, scoutSpace, config }) => {
    spaceTest.setTimeout(PARALLEL_HOST_SEED_TIMEOUT_MS);
    await scoutSpace.setSolutionView('security');
    seeded = await seedEndpointHosts({
      esClient,
      kbnClient,
      spaceId: scoutSpace.id,
      config,
      count: 3,
      isolation: false,
    });
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsT1Analyst();
  });

  spaceTest.afterAll(async () => {
    await seeded?.cleanup();
  });

  spaceTest('no column is sorted by default', async ({ page, pageObjects }) => {
    const { endpointList } = pageObjects;
    const listResponse = waitForEndpointList(page);
    await endpointList.goto();

    const response = await listResponse;
    expect(response.status()).toBe(200);
    // Without a sort in the URL the page sends none, and the server applies its default (enrolled_at desc).
    const { searchParams } = new URL(response.url());
    expect(searchParams.has('sortField')).toBe(false);
    expect(searchParams.has('sortDirection')).toBe(false);
    for (const host of seeded?.hosts ?? []) {
      await expect(endpointList.rowFor(host.hostname)).toBeVisible();
    }
    await expect(endpointList.total).toHaveText('Showing 3 endpoints');
    // The default sort (enrolled_at) has no column, so every sortable header shows none.
    for (const field of SORTABLE_COLUMNS) {
      await expect(endpointList.sortableHeader(field)).toHaveAttribute('aria-sort', 'none');
    }
  });

  spaceTest('sorts by each column ascending then descending', async ({ page, pageObjects }) => {
    const { endpointList } = pageObjects;
    await endpointList.goto();
    await expect(endpointList.total).toHaveText('Showing 3 endpoints');

    for (const field of SORTABLE_COLUMNS) {
      await spaceTest.step(`sort by ${field}`, async () => {
        const header = endpointList.sortableHeader(field);
        // The header shows the sort the server echoed back, not the one the click requested.
        for (const [direction, ariaSort] of [
          ['asc', 'ascending'],
          ['desc', 'descending'],
        ] as const) {
          const listResponse = waitForEndpointList(page, { field, direction });
          await header.click();
          expect((await listResponse).status()).toBe(200);
          await expect(header).toHaveAttribute('aria-sort', ariaSort);
        }
      });
    }
  });

  spaceTest('applies the sort passed in the URL', async ({ page, pageObjects }) => {
    const { endpointList } = pageObjects;
    const sort = { field: EndpointSortableField.HOST_STATUS, direction: 'desc' } as const;
    const listResponse = waitForEndpointList(page, sort);
    await endpointList.goto({ sortField: sort.field, sortDirection: sort.direction });

    expect((await listResponse).status()).toBe(200);
    await expect(endpointList.sortableHeader(sort.field)).toHaveAttribute(
      'aria-sort',
      'descending'
    );
  });
});
