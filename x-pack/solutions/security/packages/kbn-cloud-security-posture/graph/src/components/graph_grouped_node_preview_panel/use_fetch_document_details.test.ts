/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euid } from '@kbn/entity-store/common/euid_helpers';
import type { EsHitRecord } from '@kbn/discover-utils/types';
import { buildDocumentsRequest, buildItemFromHit } from './use_fetch_document_details';

const SOURCE = {
  '@timestamp': '2024-09-01T12:34:56.789Z',
  event: { id: 'kabcd1234efgh5678', action: 'google.iam.admin.v1.CreateRole', module: 'gcp' },
  data_stream: { dataset: 'gcp.audit' },
  user: { id: 'admin@example.com' },
  entity: { target: { id: 'projects/your-project-id/roles/customRole' } },
  source: { ip: '10.0.0.1', geo: { country_iso_code: 'US' } },
};

const buildHit = (source: Record<string, unknown>, index = 'logs-gcp.audit-default'): EsHitRecord =>
  ({ _id: 'doc-1', _index: index, _source: source } as EsHitRecord);

describe('buildItemFromHit', () => {
  it('maps the document fields and the resolved actor and targets', () => {
    expect(buildItemFromHit(buildHit(SOURCE), euid)).toMatchObject({
      itemType: 'event',
      id: 'kabcd1234efgh5678',
      docId: 'doc-1',
      index: 'logs-gcp.audit-default',
      timestamp: '2024-09-01T12:34:56.789Z',
      action: 'google.iam.admin.v1.CreateRole',
      ips: ['10.0.0.1'],
      countryCodes: ['US'],
      actor: { id: 'user:admin@example.com@gcp' },
      target: { ids: ['projects/your-project-id/roles/customRole'] },
    });
  });

  it('marks documents from the alerts index as alerts', () => {
    const item = buildItemFromHit(
      buildHit(SOURCE, '.internal.alerts-security.alerts-default-000001'),
      euid
    );

    expect(item.itemType).toBe('alert');
  });

  it('leaves actor and target unset until the euid api is available', () => {
    const item = buildItemFromHit(buildHit(SOURCE), undefined);

    expect(item.actor).toBeUndefined();
    expect(item.target).toBeUndefined();
  });

  it('leaves actor and target unset when the document has no identity fields', () => {
    const item = buildItemFromHit(buildHit({ event: { id: 'e1', action: 'a' } }), euid);

    expect(item.actor).toBeUndefined();
    expect(item.target).toBeUndefined();
  });

  it('ignores the legacy actor.entity.id and target.entity.id fields', () => {
    const item = buildItemFromHit(
      buildHit({ actor: { entity: { id: 'legacy' } }, target: { entity: { id: 'legacy-t' } } }),
      euid
    );

    expect(item.actor).toBeUndefined();
    expect(item.target).toBeUndefined();
  });
});

describe('buildDocumentsRequest', () => {
  it('looks documents up by _id so events without event.id are found', () => {
    const request = buildDocumentsRequest('logs-*', ['doc-1', 'doc-2'], 0, 10);

    expect(request.query).toEqual({
      bool: { filter: [{ ids: { values: ['doc-1', 'doc-2'] } }] },
    });
  });

  it('paginates with the given page index and size', () => {
    const request = buildDocumentsRequest('logs-*', ['doc-1'], 2, 25);

    expect(request).toMatchObject({ index: 'logs-*', from: 50, size: 25 });
  });
});
