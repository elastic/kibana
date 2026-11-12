/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { act, screen } from '@testing-library/react';
import type { CoreStart } from '@kbn/core/public';
import { openImpactEntityFlyout } from './open_impact_entity_flyout';

const opened = jest.fn();

jest.mock('./grouped_attachments/flyout_opener', () => ({
  GroupedAttachmentFlyoutOpener: ({ descriptor }: { descriptor: unknown }) => {
    // The real opener opens the flyout in an effect.
    useEffect(() => {
      opened(descriptor);
    }, [descriptor]);
    return (
      <div
        data-test-subj="groupedAttachmentFlyoutOpener"
        data-descriptor={JSON.stringify(descriptor)}
      />
    );
  },
}));

/** Enough of the rendering service for `toMountPoint`: it only wraps the node. */
const rendering = { addContext: (node: React.ReactNode) => <>{node}</> } as CoreStart['rendering'];

const container = () =>
  document.querySelector('[data-test-subj="securityImpactEntityFlyoutOpener"]');

describe('openImpactEntityFlyout', () => {
  const resolveSecurityCanvasContext = jest.fn();
  const base = { rendering, resolveSecurityCanvasContext };

  beforeEach(() => {
    opened.mockReset();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('opens an Entity Store host by its id, titled by its name', () => {
    act(() => {
      openImpactEntityFlyout({
        entity: { id: 'host:ws-finance-04', name: 'ws-finance-04', type: 'host' },
        ...base,
      });
    });

    expect(opened).toHaveBeenCalledWith({
      kind: 'host',
      hostName: 'ws-finance-04',
      entityId: 'host:ws-finance-04',
    });
  });

  it('cuts the Entity Store prefix off an id when the entity has no name yet', () => {
    act(() => {
      openImpactEntityFlyout({ entity: { id: 'user:cfo@corp' }, ...base });
    });

    expect(opened).toHaveBeenCalledWith({
      kind: 'user',
      userName: 'cfo@corp',
      entityId: 'user:cfo@corp',
    });
  });

  it('opens a user recorded by name through the user flyout, without an entity id', () => {
    act(() => {
      openImpactEntityFlyout({ entity: { id: 'jsmith', name: 'jsmith', type: 'user' }, ...base });
    });

    expect(opened).toHaveBeenCalledWith({ kind: 'user', userName: 'jsmith' });
  });

  it('opens a service by name', () => {
    act(() => {
      openImpactEntityFlyout({ entity: { id: 'okta-sso', type: 'service' }, ...base });
    });

    expect(opened).toHaveBeenCalledWith({ kind: 'service', serviceName: 'okta-sso' });
  });

  it('keeps the opener mounted after the flyout opens, so its data-view listeners can finish', () => {
    act(() => {
      openImpactEntityFlyout({ entity: { id: 'jsmith', type: 'user' }, ...base });
    });

    expect(screen.getByTestId('groupedAttachmentFlyoutOpener')).toBeInTheDocument();
    expect(container()).not.toBeNull();
  });

  it('replaces the mounted opener when another entity is opened', () => {
    act(() => {
      openImpactEntityFlyout({ entity: { id: 'jsmith', type: 'user' }, ...base });
    });
    act(() => {
      openImpactEntityFlyout({ entity: { id: 'ws-finance-04', type: 'host' }, ...base });
    });

    expect(opened).toHaveBeenCalledTimes(2);
    expect(
      document.querySelectorAll('[data-test-subj="securityImpactEntityFlyoutOpener"]')
    ).toHaveLength(1);
    expect(screen.getByTestId('groupedAttachmentFlyoutOpener')).toHaveAttribute(
      'data-descriptor',
      JSON.stringify({ kind: 'host', hostName: 'ws-finance-04' })
    );
  });

  it('does nothing when the entity has no flyout type', () => {
    act(() => {
      openImpactEntityFlyout({ entity: { id: 'generic-1', type: 'generic' }, ...base });
    });

    expect(opened).not.toHaveBeenCalled();
    expect(container()).toBeNull();
  });
});
