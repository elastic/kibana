/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_SECURITY_WORKER_CATALOG } from '@kbn/alertzero-common';
import { OTHER_WATCH_TAG, OTHER_WORKER_ID } from '../constants';
import { resolveWorkerCatalogFields } from './resolve_worker_catalog_fields';

describe('resolveWorkerCatalogFields', () => {
  it.each(SYSTEM_SECURITY_WORKER_CATALOG.map(({ id, watchTag }) => [id, watchTag]))(
    'returns the catalog id and watch tag for %s',
    (workerId, watchTag) => {
      const result = resolveWorkerCatalogFields(workerId);

      expect(result).toEqual({ watch_tag: watchTag, worker_id: workerId });
    }
  );

  it.each<[string, string | null | undefined]>([
    ['for a worker id outside the catalog', 'my-custom-workflow'],
    [
      'for a space-suffixed document id of a catalog worker',
      `${SYSTEM_SECURITY_WORKER_CATALOG[0].id}-my-space`,
    ],
    ['when the worker id is null', null],
    ['when the worker id is undefined', undefined],
    ['when the worker id is ""', ''],
  ])('returns the `other` fallback %s', (_scenario, workerId) => {
    const result = resolveWorkerCatalogFields(workerId);

    expect(result).toEqual({ watch_tag: OTHER_WATCH_TAG, worker_id: OTHER_WORKER_ID });
  });
});
