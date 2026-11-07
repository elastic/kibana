/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { HuntListItem } from '../../../../common/entity_analytics/ai_hunt_history/types';
import { HuntHistoryRail } from './hunt_history_panel';

const baseHunt = (overrides: Partial<HuntListItem>): HuntListItem => ({
  id: overrides.id ?? 'hunt-1',
  question: overrides.question ?? 'Find lateral movement across hosts in the last 7 days.',
  scopedPrompt: overrides.scopedPrompt,
  createdAt: overrides.createdAt ?? '2026-07-17T10:00:00.000Z',
  updatedAt: overrides.updatedAt ?? '2026-07-17T10:00:00.000Z',
  createdBy: overrides.createdBy ?? 'analyst',
  name: overrides.name,
  pinned: overrides.pinned ?? false,
  status: overrides.status ?? 'complete',
  summary: overrides.summary ?? {
    verdict: 'Two accounts were reactivated.',
    severity: 'high',
    findingCount: 3,
    entityCount: 2,
    alertCount: 1,
  },
});

const renderRail = (props: Partial<React.ComponentProps<typeof HuntHistoryRail>> = {}) => {
  const handlers = {
    onReopen: jest.fn(),
    onRerun: jest.fn(),
    onRename: jest.fn(),
    onTogglePinned: jest.fn(),
    onDelete: jest.fn(),
    onToggleCollapsed: jest.fn(),
  };
  render(
    <HuntHistoryRail
      hunts={props.hunts ?? [baseHunt({})]}
      isLoading={props.isLoading ?? false}
      isError={props.isError ?? false}
      isCollapsed={props.isCollapsed ?? false}
      {...handlers}
      {...props}
    />
  );
  return handlers;
};

describe('HuntHistoryRail', () => {
  it('always renders the rail, showing an empty state when there are no hunts', () => {
    renderRail({ hunts: [] });
    expect(screen.getByTestId('entityIntelligenceHuntHistoryRail')).toBeInTheDocument();
    expect(screen.getByTestId('entityIntelligenceHuntHistoryEmpty')).toBeInTheDocument();
  });

  it('shows a hunt row with its label, severity badge, and finding count', () => {
    renderRail({ hunts: [baseHunt({ name: 'My saved hunt' })] });
    expect(screen.getByText('My saved hunt')).toBeInTheDocument();
    expect(screen.getByText('high priority')).toBeInTheDocument();
    expect(screen.getByText('3 findings')).toBeInTheDocument();
  });

  it('reopens when the row label is clicked', () => {
    const handlers = renderRail();
    fireEvent.click(screen.getByTestId('entityIntelligenceHuntHistoryReopen'));
    expect(handlers.onReopen).toHaveBeenCalledWith('hunt-1');
  });

  it('marks the active hunt with an indicator and aria-current', () => {
    renderRail({
      hunts: [baseHunt({ id: 'a' }), baseHunt({ id: 'b' })],
      activeHuntId: 'b',
    });
    const indicators = screen.getAllByTestId('entityIntelligenceHuntHistoryActiveIndicator');
    expect(indicators).toHaveLength(1);
    const activeRows = screen
      .getAllByTestId('entityIntelligenceHuntHistoryRow')
      .filter((row) => row.getAttribute('aria-current') === 'true');
    expect(activeRows).toHaveLength(1);
  });

  it('reruns when the rerun button is clicked', () => {
    const hunt = baseHunt({});
    const handlers = renderRail({ hunts: [hunt] });
    fireEvent.click(screen.getByTestId('entityIntelligenceHuntHistoryRerun'));
    expect(handlers.onRerun).toHaveBeenCalledWith(hunt);
  });

  it('toggles pin from the actions menu', () => {
    const hunt = baseHunt({});
    const handlers = renderRail({ hunts: [hunt] });
    fireEvent.click(screen.getByTestId('entityIntelligenceHuntHistoryActions'));
    fireEvent.click(screen.getByTestId('entityIntelligenceHuntHistoryTogglePin'));
    expect(handlers.onTogglePinned).toHaveBeenCalledWith(hunt);
  });

  it('renames through the modal', () => {
    const handlers = renderRail();
    fireEvent.click(screen.getByTestId('entityIntelligenceHuntHistoryActions'));
    fireEvent.click(screen.getByTestId('entityIntelligenceHuntHistoryRename'));
    const input = screen.getByTestId('entityIntelligenceHuntHistoryRenameInput');
    fireEvent.change(input, { target: { value: 'Renamed hunt' } });
    fireEvent.click(screen.getByTestId('entityIntelligenceHuntHistoryRenameSubmit'));
    expect(handlers.onRename).toHaveBeenCalledWith('hunt-1', 'Renamed hunt');
  });

  it('deletes after confirming', () => {
    const handlers = renderRail();
    fireEvent.click(screen.getByTestId('entityIntelligenceHuntHistoryActions'));
    fireEvent.click(screen.getByTestId('entityIntelligenceHuntHistoryDelete'));
    const modal = screen.getByTestId('entityIntelligenceHuntHistoryDeleteModal');
    fireEvent.click(within(modal).getByText('Delete'));
    expect(handlers.onDelete).toHaveBeenCalledWith('hunt-1');
  });

  it('renders a pinned indicator for pinned hunts', () => {
    renderRail({ hunts: [baseHunt({ pinned: true })] });
    expect(screen.getByTestId('entityIntelligenceHuntHistoryPinnedIcon')).toBeInTheDocument();
  });

  it('shows an error message when loading fails', () => {
    renderRail({ hunts: [], isError: true });
    expect(screen.getByTestId('entityIntelligenceHuntHistoryError')).toBeInTheDocument();
  });

  it('collapses via the header toggle', () => {
    const handlers = renderRail();
    fireEvent.click(screen.getByTestId('entityIntelligenceHuntHistoryCollapse'));
    expect(handlers.onToggleCollapsed).toHaveBeenCalled();
  });

  it('renders a slim strip with an expand toggle when collapsed', () => {
    const handlers = renderRail({ isCollapsed: true });
    expect(screen.getByTestId('entityIntelligenceHuntHistoryRail')).toBeInTheDocument();
    // Hunt rows are hidden while collapsed.
    expect(screen.queryByTestId('entityIntelligenceHuntHistoryReopen')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('entityIntelligenceHuntHistoryExpand'));
    expect(handlers.onToggleCollapsed).toHaveBeenCalled();
  });

  it('renders the list without rail chrome in flyout variant', () => {
    renderRail({ variant: 'flyout' });
    // No collapse toggle in the flyout (the drawer supplies its own chrome).
    expect(screen.queryByTestId('entityIntelligenceHuntHistoryCollapse')).not.toBeInTheDocument();
    expect(screen.getByTestId('entityIntelligenceHuntHistoryReopen')).toBeInTheDocument();
  });
});
