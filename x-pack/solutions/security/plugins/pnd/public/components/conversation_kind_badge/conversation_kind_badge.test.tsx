/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithPndProviders } from '../test_utils/render_with_pnd_providers';
import {
  CONVERSATION_KIND_PRESENTATION,
  ConversationKindBadge,
  PND_CONVERSATION_KINDS,
  getConversationKindPresentation,
  isPndConversationKindName,
} from './conversation_kind_badge';
import type { PndConversationKindName } from './conversation_kind_badge';

describe('ConversationKindBadge', () => {
  it('covers the three per-phase conversation kinds and the per-proposal thread', () => {
    expect([...PND_CONVERSATION_KINDS]).toEqual(['incident', 'investigation', 'thread', 'tuning']);
  });

  it('renders one badge per kind', () => {
    PND_CONVERSATION_KINDS.forEach((kind) => {
      const { unmount } = renderWithPndProviders(<ConversationKindBadge kind={kind} />);

      expect(screen.getByTestId('pndConversationKindBadge')).toHaveAttribute('data-kind', kind);
      unmount();
    });
  });

  it('renders the kind label as the badge text', () => {
    renderWithPndProviders(<ConversationKindBadge kind="investigation" />);

    expect(screen.getByTestId('pndConversationKindBadge')).toHaveTextContent(
      CONVERSATION_KIND_PRESENTATION.investigation.label
    );
  });

  it('gives every kind a distinct label', () => {
    const labels = PND_CONVERSATION_KINDS.map((kind) => CONVERSATION_KIND_PRESENTATION[kind].label);

    expect(new Set(labels).size).toBe(PND_CONVERSATION_KINDS.length);
  });

  it('gives every kind a distinct color', () => {
    const colors = PND_CONVERSATION_KINDS.map((kind) => CONVERSATION_KIND_PRESENTATION[kind].color);

    expect(new Set(colors).size).toBe(PND_CONVERSATION_KINDS.length);
  });

  it('says a sub-investigation is paired with an action rather than with a phase', () => {
    expect(CONVERSATION_KIND_PRESENTATION.thread.description).toMatch(/action/i);
  });

  /**
   * The `thread` key is the wire value; `Sub-investigation` is the naming framework's word for it.
   * Pinned because the split between the two is easy to "tidy" away in one direction or the other.
   */
  it('labels the thread kind with the naming framework word for it', () => {
    expect(CONVERSATION_KIND_PRESENTATION.thread.label).toEqual('Sub-investigation');
  });

  describe('isPndConversationKindName', () => {
    it.each([...PND_CONVERSATION_KINDS])('recognizes the presented kind %s', (kind) => {
      expect(isPndConversationKindName(kind)).toBe(true);
    });

    it('rejects a kind this badge has no presentation for', () => {
      expect(isPndConversationKindName('invented_kind')).toBe(false);
    });
  });

  describe('getConversationKindPresentation', () => {
    it('returns the presentation for a known kind', () => {
      expect(getConversationKindPresentation('tuning')).toEqual(
        CONVERSATION_KIND_PRESENTATION.tuning
      );
    });

    it('falls back to an unknown treatment rather than rendering nothing', () => {
      // Cast: the fallback exists for a server that adds a kind before the UI does.
      const presentation = getConversationKindPresentation(
        'invented_kind' as PndConversationKindName
      );

      expect(presentation.label).toMatch(/unknown/i);
    });
  });

  it('renders an unknown kind without crashing', () => {
    renderWithPndProviders(
      <ConversationKindBadge kind={'invented_kind' as PndConversationKindName} />
    );

    expect(screen.getByTestId('pndConversationKindBadge')).toBeInTheDocument();
  });
});
