/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSecurityActionMenuContributions } from './create_contributions';
import type { SecurityActionMenuDefinition } from './create_contributions';

const definition = {
  actions: {
    open: { icon: 'dot', sourceKeys: ['open-item'] },
    close: { icon: 'cross', sourceKeys: ['close-item'] },
    manage: { icon: 'gear', sourceKeys: ['manage-item'] },
  },
  sources: {
    status: { actionIds: ['open', 'close'] },
    management: { actionIds: ['manage'], contributionMode: 'single' },
  },
} as const satisfies SecurityActionMenuDefinition<
  'open' | 'close' | 'manage',
  'status' | 'management'
>;

describe('createSecurityActionMenuContributions', () => {
  it('creates and decorates one contribution per item by default', () => {
    expect(
      createSecurityActionMenuContributions(definition, {
        status: {
          items: [
            { key: 'open-item', name: 'Open' },
            { key: 'close-item', name: 'Close' },
          ],
          panels: [{ id: 'status-panel' }],
        },
      })
    ).toEqual([
      {
        id: 'open',
        items: [{ key: 'open-item', name: 'Open', icon: 'dot' }],
        panels: [{ id: 'status-panel' }],
      },
      {
        id: 'close',
        items: [{ key: 'close-item', name: 'Close', icon: 'cross' }],
      },
    ]);
  });

  it('can preserve multiple items in one contribution', () => {
    expect(
      createSecurityActionMenuContributions(definition, {
        management: {
          items: [
            { key: 'manage-item', name: 'Manage' },
            { key: 'other-item', name: 'Other' },
          ],
        },
      })
    ).toEqual([
      {
        id: 'manage',
        items: [
          { key: 'manage-item', name: 'Manage', icon: 'gear' },
          { key: 'other-item', name: 'Other' },
        ],
      },
    ]);
  });

  it('omits a source when any visibility condition is false', () => {
    expect(
      createSecurityActionMenuContributions(definition, {
        status: {
          items: [{ key: 'open-item', name: 'Open' }],
          visibleWhen: [true, false],
        },
      })
    ).toEqual([]);
  });
});
