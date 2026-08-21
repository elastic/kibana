/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { SignificantEventItem } from './significant_event_item';

const mockEvent: SignificantEvent = {
  '@timestamp': new Date().toISOString(),
  event_id: 'evt-1',
  event_uuid: 'evt-uuid-1',
  status: 'open',
  stream_names: ['service-a'],
  title: 'Test significant event',
  summary: 'Something happened',
  severity: '60-high',
  confidence: 0.9,
};

const investigatedEvent: SignificantEvent = {
  ...mockEvent,
  investigations: [
    {
      workflow_execution_id: 'exec-1',
      started_at: '2026-07-10T12:00:00Z',
      completed_at: '2026-07-10T12:05:00Z',
    },
  ],
};

describe('SignificantEventItem', () => {
  const renderItem = (props: Partial<React.ComponentProps<typeof SignificantEventItem>> = {}) =>
    render(
      <I18nProvider>
        <EuiProvider>
          <SignificantEventItem event={mockEvent} {...props} />
        </EuiProvider>
      </I18nProvider>
    );

  it('makes the whole row clickable when onClick is provided', () => {
    const onClick = jest.fn();
    renderItem({ onClick });

    const row = screen.getByTestId('nightshiftSignificantEventItem');
    expect(row).toHaveAttribute('role', 'button');
    expect(row).toHaveAttribute('tabindex', '0');
    expect(row).toHaveAttribute('data-ebt-action', 'viewSignificantEvent');
    expect(row).toHaveAttribute('data-ebt-element', 'nightshiftSignificantEventsList');
    expect(row).toHaveAttribute('data-ebt-detail', 'open');

    fireEvent.click(row);
    expect(onClick).toHaveBeenCalledWith(mockEvent);
  });

  it('activates the row with Enter and Space keys', () => {
    const onClick = jest.fn();
    renderItem({ onClick });

    const row = screen.getByTestId('nightshiftSignificantEventItem');
    fireEvent.keyDown(row, { key: 'Enter' });
    fireEvent.keyDown(row, { key: ' ' });
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('does not activate the row for other keys', () => {
    const onClick = jest.fn();
    renderItem({ onClick });

    const row = screen.getByTestId('nightshiftSignificantEventItem');
    fireEvent.keyDown(row, { key: 'Tab' });
    fireEvent.keyDown(row, { key: 'Escape' });
    expect(onClick).not.toHaveBeenCalled();
  });

  it('ignores key presses bubbling from nested interactive elements', () => {
    const onClick = jest.fn();
    const onChatClick = jest.fn();
    renderItem({ onClick, onChatClick });

    fireEvent.keyDown(screen.getByTestId('nightshiftOpenEventInChatButton'), { key: 'Enter' });
    expect(onClick).not.toHaveBeenCalled();
  });

  it('does not open the flyout when the click ends a text selection', () => {
    const onClick = jest.fn();
    renderItem({ onClick });

    const getSelectionSpy = jest
      .spyOn(window, 'getSelection')
      .mockReturnValue({ toString: () => 'selected text' } as Selection);

    fireEvent.click(screen.getByTestId('nightshiftSignificantEventItem'));
    expect(onClick).not.toHaveBeenCalled();

    getSelectionSpy.mockRestore();
  });

  it('is not interactive without onClick', () => {
    renderItem();

    const row = screen.getByTestId('nightshiftSignificantEventItem');
    expect(row).not.toHaveAttribute('role');
    expect(row).not.toHaveAttribute('tabindex');
  });

  it('opens chat without triggering the row click', () => {
    const onClick = jest.fn();
    const onChatClick = jest.fn();
    renderItem({ onClick, onChatClick });

    const chatButton = screen.getByTestId('nightshiftOpenEventInChatButton');
    expect(chatButton).toHaveAttribute('data-ebt-action', 'openInChat');
    expect(chatButton).toHaveAttribute('data-ebt-element', 'nightshiftSignificantEventsList');
    expect(chatButton).toHaveAttribute('data-ebt-detail', 'newConversation');

    fireEvent.click(chatButton);
    expect(onChatClick).toHaveBeenCalledWith(mockEvent);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('closes the event without triggering the row click', () => {
    const onClick = jest.fn();
    const onCloseClick = jest.fn();
    renderItem({ onClick, onCloseClick });

    const closeButton = screen.getByTestId('nightshiftCloseSignificantEventButton');
    expect(closeButton).toHaveAttribute('data-ebt-action', 'closeSignificantEvent');
    expect(closeButton).toHaveAttribute('data-ebt-element', 'nightshiftSignificantEventsList');
    expect(closeButton).toHaveAttribute('data-ebt-detail', 'needsAction');

    fireEvent.click(closeButton);
    expect(onCloseClick).toHaveBeenCalledWith(mockEvent);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('shows progress while closing', () => {
    renderItem({ onCloseClick: jest.fn(), isClosing: true });

    expect(screen.getByTestId('nightshiftCloseSignificantEventButton')).toBeDisabled();
  });

  it.each(['closed', 'dismissed'] as const)('hides the close action for %s events', (status) => {
    renderItem({ event: { ...mockEvent, status }, onCloseClick: jest.fn() });

    expect(screen.queryByTestId('nightshiftCloseSignificantEventButton')).not.toBeInTheDocument();
  });

  it('marks the row as selected when isSelected is true', () => {
    renderItem({ onClick: jest.fn(), isSelected: true });

    expect(screen.getByTestId('nightshiftSignificantEventItem')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('marks the row as unselected when isSelected is false', () => {
    renderItem({ onClick: jest.fn(), isSelected: false });

    expect(screen.getByTestId('nightshiftSignificantEventItem')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('renders the title as plain text, not a link or button', () => {
    const onClick = jest.fn();
    renderItem({ onClick });

    const title = screen.getByText(mockEvent.title);
    expect(title.closest('a')).toBeNull();
    expect(title.closest('button')).toBeNull();
  });

  describe('investigation marker', () => {
    it('leaves an event without investigations unlabeled', () => {
      renderItem();

      expect(screen.queryByTestId('nightshiftInvestigatedStatus')).not.toBeInTheDocument();
      expect(screen.queryByTestId('nightshiftInvestigationFailedStatus')).not.toBeInTheDocument();
    });

    it('falls back to completed_at while the status is still being fetched', () => {
      renderItem({ event: investigatedEvent });

      expect(screen.getByTestId('nightshiftInvestigatedStatus')).toHaveTextContent('Investigated');
      expect(screen.queryByTestId('nightshiftInvestigationFailedStatus')).not.toBeInTheDocument();
    });

    it('marks a complete run as investigated', () => {
      renderItem({ event: investigatedEvent, investigationRunStatus: 'complete' });

      expect(screen.getByTestId('nightshiftInvestigatedStatus')).toHaveTextContent('Investigated');
      expect(screen.queryByTestId('nightshiftInvestigationFailedStatus')).not.toBeInTheDocument();
    });

    it('marks a failed run with the failure label even though the run completed', () => {
      renderItem({ event: investigatedEvent, investigationRunStatus: 'failed' });

      expect(screen.getByTestId('nightshiftInvestigationFailedStatus')).toHaveTextContent(
        'Investigation failed'
      );
      expect(screen.queryByTestId('nightshiftInvestigatedStatus')).not.toBeInTheDocument();
    });

    it('marks an unreadable run as unavailable', () => {
      renderItem({ event: investigatedEvent, investigationRunStatus: 'unavailable' });

      expect(screen.getByTestId('nightshiftInvestigationFailedStatus')).toHaveTextContent(
        'Investigation unavailable'
      );
      expect(screen.queryByTestId('nightshiftInvestigatedStatus')).not.toBeInTheDocument();
    });

    it('hides the badge when the execution does not exist', () => {
      renderItem({ event: investigatedEvent, investigationRunStatus: null });

      expect(screen.queryByTestId('nightshiftInvestigatedStatus')).not.toBeInTheDocument();
      expect(screen.queryByTestId('nightshiftInvestigationFailedStatus')).not.toBeInTheDocument();
      expect(screen.queryByTestId('nightshiftInvestigatingStatusDots')).not.toBeInTheDocument();
    });

    it('marks a pending run as investigating', () => {
      renderItem({ event: investigatedEvent, investigationRunStatus: 'pending' });

      expect(screen.getByTestId('nightshiftInvestigatingStatusDots')).toBeInTheDocument();
      expect(screen.queryByTestId('nightshiftInvestigatedStatus')).not.toBeInTheDocument();
    });
  });
});
