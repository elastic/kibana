/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, screen } from '@testing-library/react';
import type { CoreStart } from '@kbn/core/public';
import { openImpactEntityFlyout } from './open_impact_entity_flyout';

jest.mock('./grouped_attachments/flyout_opener', () => ({
  GroupedAttachmentFlyoutOpener: ({ descriptor }: { descriptor: unknown }) => (
    <div
      data-test-subj="groupedAttachmentFlyoutOpener"
      data-descriptor={JSON.stringify(descriptor)}
    />
  ),
}));

/** Enough of the rendering service for `toMountPoint`: it only wraps the node. */
const rendering = { addContext: (node: React.ReactNode) => <>{node}</> } as CoreStart['rendering'];

const readDescriptor = () =>
  JSON.parse(screen.getByTestId('groupedAttachmentFlyoutOpener').dataset.descriptor ?? '');

describe('openImpactEntityFlyout', () => {
  const resolveSecurityCanvasContext = jest.fn();
  const base = { rendering, resolveSecurityCanvasContext };

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('mounts the grouped attachment opener with a host descriptor for an Entity Store host', () => {
    act(() => {
      openImpactEntityFlyout({
        entity: { id: 'host:ws-finance-04', name: 'ws-finance-04', type: 'host' },
        ...base,
      });
    });

    expect(readDescriptor()).toEqual({
      kind: 'host',
      hostName: 'ws-finance-04',
      entityId: 'host:ws-finance-04',
    });
  });

  it('opens a user recorded by name through the user flyout, without an entity id', () => {
    act(() => {
      openImpactEntityFlyout({
        entity: { id: 'jsmith', name: 'jsmith', type: 'user' },
        ...base,
      });
    });

    expect(readDescriptor()).toEqual({ kind: 'user', userName: 'jsmith' });
  });

  it('opens a service by name', () => {
    act(() => {
      openImpactEntityFlyout({
        entity: { id: 'okta-sso', type: 'service' },
        ...base,
      });
    });

    expect(readDescriptor()).toEqual({ kind: 'service', serviceName: 'okta-sso' });
  });

  it('keeps one opener mounted and replaces it on the next open', () => {
    act(() => {
      openImpactEntityFlyout({ entity: { id: 'jsmith', type: 'user' }, ...base });
    });
    act(() => {
      openImpactEntityFlyout({ entity: { id: 'ws-finance-04', type: 'host' }, ...base });
    });

    expect(screen.getAllByTestId('groupedAttachmentFlyoutOpener')).toHaveLength(1);
    expect(
      document.querySelectorAll('[data-test-subj="securityImpactEntityFlyoutOpener"]')
    ).toHaveLength(1);
    expect(readDescriptor()).toEqual({ kind: 'host', hostName: 'ws-finance-04' });
  });

  it('does nothing when the entity has no flyout type', () => {
    act(() => {
      openImpactEntityFlyout({ entity: { id: 'generic-1', type: 'generic' }, ...base });
    });

    expect(screen.queryByTestId('groupedAttachmentFlyoutOpener')).not.toBeInTheDocument();
  });
});
