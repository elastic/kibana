/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { renderWithPndProviders } from '../../../../components/test_utils/render_with_pnd_providers';
import { mockNestedConversations } from '../../mock/conversations';
import { ConversationKpiTiles } from '.';

const defaultProps = {
  conversations: mockNestedConversations,
  isFilterActive: false,
};

describe('ConversationKpiTiles', () => {
  it('renders four stats', () => {
    renderWithPndProviders(<ConversationKpiTiles {...defaultProps} />);

    expect(screen.getAllByTestId(/^pndChatsKpiTile-/)).toHaveLength(4);
  });

  it('counts every loaded conversation as all chats', () => {
    renderWithPndProviders(<ConversationKpiTiles {...defaultProps} />);

    expect(screen.getByTestId('pndChatsKpiTile-all')).toHaveTextContent(
      String(mockNestedConversations.length)
    );
  });

  it('counts investigations, incidents and sub-investigations from countConversationsByKind', () => {
    renderWithPndProviders(<ConversationKpiTiles {...defaultProps} />);

    expect(screen.getByTestId('pndChatsKpiTile-investigation')).toHaveTextContent('1');
    expect(screen.getByTestId('pndChatsKpiTile-incident')).toHaveTextContent('1');
    expect(screen.getByTestId('pndChatsKpiTile-thread')).toHaveTextContent('2');
  });

  it('names the four categories', () => {
    renderWithPndProviders(<ConversationKpiTiles {...defaultProps} />);

    expect(screen.getByTestId('pndChatsKpiTile-all')).toHaveTextContent('All chats');
    expect(screen.getByTestId('pndChatsKpiTile-investigation')).toHaveTextContent('Investigations');
    expect(screen.getByTestId('pndChatsKpiTile-incident')).toHaveTextContent('Incidents');
    expect(screen.getByTestId('pndChatsKpiTile-thread')).toHaveTextContent('Sub-investigations');
  });

  it('draws no trend arrow', () => {
    const { container } = renderWithPndProviders(<ConversationKpiTiles {...defaultProps} />);

    expect(container.querySelector('[class*="trend"]')).toBeNull();
  });

  it('renders nothing when the list is genuinely empty', () => {
    renderWithPndProviders(<ConversationKpiTiles conversations={[]} isFilterActive={false} />);

    expect(screen.queryAllByTestId(/^pndChatsKpiTile-/)).toHaveLength(0);
  });

  it('renders four zero tiles when a filter is active and nothing matches', () => {
    renderWithPndProviders(<ConversationKpiTiles conversations={[]} isFilterActive />);

    expect(screen.getByTestId('pndChatsKpiTileCount-all')).toHaveTextContent('0');
    expect(screen.getByTestId('pndChatsKpiTileCount-investigation')).toHaveTextContent('0');
    expect(screen.getByTestId('pndChatsKpiTileCount-incident')).toHaveTextContent('0');
    expect(screen.getByTestId('pndChatsKpiTileCount-thread')).toHaveTextContent('0');
  });

  it('keeps a zero kind on screen when other kinds have rows', () => {
    const withoutThreads = mockNestedConversations.filter(({ kind }) => kind !== 'thread');

    renderWithPndProviders(
      <ConversationKpiTiles conversations={withoutThreads} isFilterActive={false} />
    );

    expect(screen.getByTestId('pndChatsKpiTileCount-thread')).toHaveTextContent('0');
  });
});
