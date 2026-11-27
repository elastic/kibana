/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFindResult } from '@kbn/core/server';
import { savedObjectsRepositoryMock } from '@kbn/core-saved-objects-api-server-mocks';
import { findInventoryScheduleIds, OSQUERY_PACK_SO_TYPE } from './schedule_ids';

const pack = (
  id: string,
  name: string,
  namespaces: string[] | undefined,
  queries: Array<{ id: string; schedule_id?: string }>
): SavedObjectsFindResult<unknown> => ({
  id,
  type: OSQUERY_PACK_SO_TYPE,
  references: [],
  score: 1,
  namespaces,
  attributes: { name, queries },
});

const page = (packs: Array<SavedObjectsFindResult<unknown>>, total: number, pageNo = 1) => ({
  saved_objects: packs,
  total,
  per_page: 100,
  page: pageNo,
});

describe('findInventoryScheduleIds', () => {
  it('returns the minted and legacy schedule ids of the inventory queries, per kind', async () => {
    const repository = savedObjectsRepositoryMock.create();
    repository.find.mockResolvedValueOnce(
      page(
        [
          pack(
            'p1',
            'software-inventory',
            ['default'],
            [
              { id: 'native_vuln_scanner_deb_packages', schedule_id: 'uuid-deb' },
              { id: 'native_vuln_scanner_os_version' },
              { id: 'some_other_query', schedule_id: 'uuid-other' },
            ]
          ),
          pack(
            'p2',
            'software-inventory',
            ['team-a'],
            [{ id: 'native_vuln_scanner_deb_packages', schedule_id: 'uuid-deb-a' }]
          ),
        ],
        2
      )
    );

    const ids = await findInventoryScheduleIds(repository);

    expect(repository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        type: OSQUERY_PACK_SO_TYPE,
        namespaces: ['*'],
        searchFields: ['name'],
      })
    );
    expect(ids).toEqual({
      deb_packages: [
        'uuid-deb',
        'pack_software-inventory_native_vuln_scanner_deb_packages',
        'pack_default--software-inventory_native_vuln_scanner_deb_packages',
        'uuid-deb-a',
        'pack_team-a--software-inventory_native_vuln_scanner_deb_packages',
      ],
      os_version: [
        'pack_software-inventory_native_vuln_scanner_os_version',
        'pack_default--software-inventory_native_vuln_scanner_os_version',
      ],
    });
  });

  it('ignores packs whose name only matches the fuzzy text search', async () => {
    const repository = savedObjectsRepositoryMock.create();
    repository.find.mockResolvedValueOnce(
      page(
        [
          pack(
            'p1',
            'software-inventory-old',
            ['default'],
            [{ id: 'native_vuln_scanner_deb_packages', schedule_id: 'uuid-x' }]
          ),
        ],
        1
      )
    );
    expect(await findInventoryScheduleIds(repository)).toEqual({});
  });

  it('pages through every match', async () => {
    const repository = savedObjectsRepositoryMock.create();
    const filler = Array.from({ length: 100 }, (_, i) => pack(`f${i}`, 'other', ['default'], []));
    repository.find
      .mockResolvedValueOnce(page(filler, 101))
      .mockResolvedValueOnce(
        page(
          [
            pack(
              'p1',
              'software-inventory',
              ['default'],
              [{ id: 'native_vuln_scanner_rpm_packages', schedule_id: 'uuid-rpm' }]
            ),
          ],
          101,
          2
        )
      );

    const ids = await findInventoryScheduleIds(repository);

    expect(repository.find).toHaveBeenCalledTimes(2);
    expect(repository.find.mock.calls[1][0]).toEqual(expect.objectContaining({ page: 2 }));
    expect(ids.rpm_packages).toContain('uuid-rpm');
  });
});
