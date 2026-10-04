/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { decode } from '@kbn/rison';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import type { ApplicationStart } from '@kbn/core-application-browser';
import { FLYOUT_DESCRIPTOR_KIND } from '../../../flyout_v2/shared/url_state/flyout_v2_url_param';
import { EntityPill } from './entity_pill';
import type { EntityAttachmentMultiData, EntityAttachmentSingleData } from './types';

jest.mock('../conversation_details/pills', () => ({
  FlyoutPill: ({
    label,
    resolveDescriptor,
  }: {
    label: string;
    resolveDescriptor: () => Promise<unknown>;
  }) => {
    (
      EntitySinglePillCaptured as { lastResolveDescriptor: () => Promise<unknown> }
    ).lastResolveDescriptor = resolveDescriptor;
    return (
      <button type="button" data-test-subj="flyout-pill">
        {label}
      </button>
    );
  },
  LinkPill: ({ label, href }: { label: string; href: string }) => (
    <a data-test-subj="link-pill" href={href}>
      {label}
    </a>
  ),
}));

const EntitySinglePillCaptured: { lastResolveDescriptor?: () => Promise<unknown> } = {};

const mockGetUrlForApp = jest.fn((_, { path }: { path?: string } = {}) => path ?? '');
const application = { getUrlForApp: mockGetUrlForApp } as unknown as ApplicationStart;
const resolveSecurityCanvasContext = jest.fn();

const singleAttachment = (data: EntityAttachmentSingleData): UnknownAttachment => ({
  id: 'attachment-1',
  type: 'security.entity',
  data,
});

const multiAttachment = (data: EntityAttachmentMultiData): UnknownAttachment => ({
  id: 'attachment-1',
  type: 'security.entity',
  data,
});

describe('EntityPill – toEntityDescriptor via single-entity pill', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    EntitySinglePillCaptured.lastResolveDescriptor = undefined;
  });

  it('resolves a host descriptor', async () => {
    render(
      <EntityPill
        attachment={singleAttachment({ identifierType: 'host', identifier: 'my-host' })}
        application={application}
        resolveSecurityCanvasContext={resolveSecurityCanvasContext}
      />
    );

    const descriptor = await EntitySinglePillCaptured.lastResolveDescriptor!();
    expect(descriptor).toEqual({
      kind: FLYOUT_DESCRIPTOR_KIND.host,
      hostName: 'my-host',
      entityId: undefined,
    });
  });

  it('resolves a user descriptor', async () => {
    render(
      <EntityPill
        attachment={singleAttachment({ identifierType: 'user', identifier: 'alice' })}
        application={application}
        resolveSecurityCanvasContext={resolveSecurityCanvasContext}
      />
    );

    const descriptor = await EntitySinglePillCaptured.lastResolveDescriptor!();
    expect(descriptor).toEqual({
      kind: FLYOUT_DESCRIPTOR_KIND.user,
      userName: 'alice',
      entityId: undefined,
    });
  });

  it('resolves a service descriptor', async () => {
    render(
      <EntityPill
        attachment={singleAttachment({ identifierType: 'service', identifier: 'my-svc' })}
        application={application}
        resolveSecurityCanvasContext={resolveSecurityCanvasContext}
      />
    );

    const descriptor = await EntitySinglePillCaptured.lastResolveDescriptor!();
    expect(descriptor).toEqual({
      kind: FLYOUT_DESCRIPTOR_KIND.service,
      serviceName: 'my-svc',
      entityId: undefined,
    });
  });

  it('resolves a generic entity descriptor when entityStoreId is present', async () => {
    render(
      <EntityPill
        attachment={singleAttachment({
          identifierType: 'generic',
          identifier: 'thing',
          entityStoreId: 'store-id-1',
        })}
        application={application}
        resolveSecurityCanvasContext={resolveSecurityCanvasContext}
      />
    );

    const descriptor = await EntitySinglePillCaptured.lastResolveDescriptor!();
    expect(descriptor).toEqual({
      kind: FLYOUT_DESCRIPTOR_KIND.genericEntity,
      scopeId: '',
      entityId: 'store-id-1',
    });
  });

  it('returns null for a generic entity without entityStoreId', async () => {
    render(
      <EntityPill
        attachment={singleAttachment({ identifierType: 'generic', identifier: 'thing' })}
        application={application}
        resolveSecurityCanvasContext={resolveSecurityCanvasContext}
      />
    );

    // Without a store id, toEntityDescriptor returns null → EntitySinglePill renders null.
    expect(EntitySinglePillCaptured.lastResolveDescriptor).toBeUndefined();
    expect(screen.queryByTestId('flyout-pill')).not.toBeInTheDocument();
  });

  it('returns null for an unknown identifier type', async () => {
    render(
      <EntityPill
        attachment={singleAttachment({
          identifierType: 'unknown' as 'host',
          identifier: 'thing',
        })}
        application={application}
        resolveSecurityCanvasContext={resolveSecurityCanvasContext}
      />
    );

    expect(EntitySinglePillCaptured.lastResolveDescriptor).toBeUndefined();
    expect(screen.queryByTestId('flyout-pill')).not.toBeInTheDocument();
  });
});

describe('EntityPill – multiple entities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a link pill for multiple entities', () => {
    render(
      <EntityPill
        attachment={multiAttachment({
          entities: [
            { identifierType: 'host', identifier: 'host-a' },
            { identifierType: 'user', identifier: 'user-b' },
          ],
        })}
        application={application}
        resolveSecurityCanvasContext={resolveSecurityCanvasContext}
      />
    );

    expect(screen.getByTestId('link-pill')).toHaveTextContent('2 entities');
  });

  it('KQL in cspq includes all entity identifiers', () => {
    render(
      <EntityPill
        attachment={multiAttachment({
          entities: [
            { identifierType: 'host', identifier: 'host-a' },
            { identifierType: 'user', identifier: 'user-b' },
          ],
        })}
        application={application}
        resolveSecurityCanvasContext={resolveSecurityCanvasContext}
      />
    );

    const path = (mockGetUrlForApp.mock.calls[0][1] as { path: string }).path;
    const params = new URLSearchParams(path.replace(/^\?/, ''));
    const cspq = decode(params.get('cspq')!) as { query: { query: string } };

    expect(cspq.query.query).toContain('"host-a"');
    expect(cspq.query.query).toContain('"user-b"');
  });

  it('escapes quotes in entity identifiers within the KQL', () => {
    render(
      <EntityPill
        attachment={multiAttachment({
          entities: [
            { identifierType: 'host', identifier: 'host"with"quotes' },
            { identifierType: 'user', identifier: 'user-b' },
          ],
        })}
        application={application}
        resolveSecurityCanvasContext={resolveSecurityCanvasContext}
      />
    );

    const path = (mockGetUrlForApp.mock.calls[0][1] as { path: string }).path;
    const params = new URLSearchParams(path.replace(/^\?/, ''));
    const cspq = decode(params.get('cspq')!) as { query: { query: string } };

    // Escaped with backslash per escapeQuotes from @kbn/es-query
    expect(cspq.query.query).toContain('host\\"with\\"quotes');
  });
});
