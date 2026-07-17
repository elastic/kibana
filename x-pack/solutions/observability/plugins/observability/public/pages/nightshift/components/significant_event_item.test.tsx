/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

describe('SignificantEventItem', () => {
  const renderItem = (props: Partial<React.ComponentProps<typeof SignificantEventItem>> = {}) =>
    render(
      <I18nProvider>
        <SignificantEventItem event={mockEvent} {...props} />
      </I18nProvider>
    );

  it('makes the whole row clickable when onClick is provided', () => {
    const onClick = jest.fn();
    renderItem({ onClick });

    const row = screen.getByTestId('nightshiftSignificantEventItem');
    expect(row).toHaveAttribute('role', 'button');
    expect(row).toHaveAttribute('tabindex', '0');

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

    fireEvent.click(screen.getByTestId('nightshiftOpenEventInChatButton'));
    expect(onChatClick).toHaveBeenCalledWith(mockEvent);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders the title as plain text, not a link or button', () => {
    const onClick = jest.fn();
    renderItem({ onClick });

    const title = screen.getByText(mockEvent.title);
    expect(title.closest('a')).toBeNull();
    expect(title.closest('button')).toBeNull();
  });
});
