/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX,
  ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX,
} from '@kbn/elastic-assistant-common';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import { FLYOUT_DESCRIPTOR_KIND } from '../../../flyout_v2/shared/url_state/flyout_v2_url_param';
import { AttackPill } from './attack_pill';

// Capture the resolveDescriptor that FlyoutPill receives so we can call it directly.
const captured: { resolveDescriptor?: () => Promise<unknown> } = {};

jest.mock('../conversation_details/pills', () => ({
  FlyoutPill: ({
    label,
    resolveDescriptor,
  }: {
    label: string;
    resolveDescriptor: () => Promise<unknown>;
  }) => {
    captured.resolveDescriptor = resolveDescriptor;
    return (
      <button type="button" data-test-subj="flyout-pill">
        {label}
      </button>
    );
  },
}));

const getSpaceId = jest.fn().mockResolvedValue('default');
const resolveSecurityCanvasContext = jest.fn();

const makeAttachment = (data: Record<string, unknown>, origin?: string): UnknownAttachment => ({
  id: 'attachment-1',
  type: 'security.attack_discovery',
  data,
  origin,
});

describe('AttackPill', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    captured.resolveDescriptor = undefined;
  });

  it('renders nothing when there is no attack id', () => {
    const { container } = render(
      <AttackPill
        attachment={makeAttachment({})}
        getSpaceId={getSpaceId}
        label="1 attack"
        resolveSecurityCanvasContext={resolveSecurityCanvasContext}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders a flyout pill when the id is in data', () => {
    render(
      <AttackPill
        attachment={makeAttachment({ id: 'attack-1' })}
        getSpaceId={getSpaceId}
        label="1 attack"
        resolveSecurityCanvasContext={resolveSecurityCanvasContext}
      />
    );

    expect(screen.getByTestId('flyout-pill')).toHaveTextContent('1 attack');
  });

  it('renders a flyout pill when the id comes from the origin field', () => {
    render(
      <AttackPill
        attachment={makeAttachment({}, 'attack-from-origin')}
        getSpaceId={getSpaceId}
        label="1 attack"
        resolveSecurityCanvasContext={resolveSecurityCanvasContext}
      />
    );

    expect(screen.getByTestId('flyout-pill')).toBeInTheDocument();
  });

  it('descriptor uses the comma-joined attack-discovery index pattern', async () => {
    render(
      <AttackPill
        attachment={makeAttachment({ id: 'attack-1' })}
        getSpaceId={getSpaceId}
        label="1 attack"
        resolveSecurityCanvasContext={resolveSecurityCanvasContext}
      />
    );

    const descriptor = await captured.resolveDescriptor!();
    const expectedIndex = [
      ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX,
      ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX,
    ]
      .map((p) => `${p}-default`)
      .join(',');

    expect(descriptor).toEqual({
      kind: FLYOUT_DESCRIPTOR_KIND.attack,
      attackId: 'attack-1',
      indexName: expectedIndex,
    });
  });

  it('descriptor returns null when there is no attack id', async () => {
    // origin is undefined, data has no id, so resolveDescriptor should return null
    // but the component renders nothing in that case — verify via the component
    const { container } = render(
      <AttackPill
        attachment={makeAttachment({})}
        getSpaceId={getSpaceId}
        label="1 attack"
        resolveSecurityCanvasContext={resolveSecurityCanvasContext}
      />
    );

    // No pill rendered and no descriptor was captured
    expect(container).toBeEmptyDOMElement();
    expect(captured.resolveDescriptor).toBeUndefined();
  });
});
