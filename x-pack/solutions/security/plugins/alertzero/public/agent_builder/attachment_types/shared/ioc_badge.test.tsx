/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { IocBadge, discoverAction } from './ioc_badge';

describe('discoverAction', () => {
  it('returns an Open in Discover action for a defined href', () => {
    expect(discoverAction('https://kbn.test/discover')).toEqual({
      href: 'https://kbn.test/discover',
      iconType: 'discoverApp',
      label: 'Open in Discover',
    });
  });

  it('returns undefined when there is no href', () => {
    expect(discoverAction(undefined)).toBeUndefined();
  });
});

describe('IocBadge', () => {
  it('renders the value', () => {
    render(<IocBadge value="203.0.113.4" index={0} testSubj="test-ioc-badge" />);
    expect(screen.getByTestId('test-ioc-badge')).toHaveTextContent('203.0.113.4');
  });

  it('shows a copy action on hover', () => {
    render(<IocBadge value="203.0.113.4" index={0} testSubj="test-ioc-badge" />);
    const badge = screen.getByTestId('test-ioc-badge').querySelector('.euiBadge');
    expect(badge).not.toBeNull();
    fireEvent.mouseEnter(badge as Element);
    expect(screen.getByLabelText('Copy')).toBeInTheDocument();
  });

  it('shows no extra action when none is provided', () => {
    render(<IocBadge value="203.0.113.4" index={0} testSubj="test-ioc-badge" />);
    const badge = screen.getByTestId('test-ioc-badge').querySelector('.euiBadge');
    fireEvent.mouseEnter(badge as Element);
    expect(screen.queryByLabelText('Open in Discover')).not.toBeInTheDocument();
  });

  it('shows the supplied action when provided', () => {
    render(
      <IocBadge
        value="203.0.113.4"
        index={0}
        action={{
          href: 'https://kbn.test/discover',
          iconType: 'discoverApp',
          label: 'Open in Discover',
        }}
        testSubj="test-ioc-badge"
      />
    );
    const badge = screen.getByTestId('test-ioc-badge').querySelector('.euiBadge');
    fireEvent.mouseEnter(badge as Element);
    expect(screen.getByLabelText('Open in Discover')).toBeInTheDocument();
  });

  it('supports a caller-chosen action label and icon (e.g. Open alert details)', () => {
    render(
      <IocBadge
        value="alert-1"
        index={0}
        action={{
          href: 'https://kbn.test/app/security/alerts/redirect/alert-1',
          iconType: 'securitySignalDetected',
          label: 'Open alert details',
        }}
        testSubj="test-ioc-badge"
      />
    );
    const badge = screen.getByTestId('test-ioc-badge').querySelector('.euiBadge');
    fireEvent.mouseEnter(badge as Element);
    expect(screen.getByLabelText('Open alert details')).toBeInTheDocument();
  });

  it('keeps the actions mounted when the pointer leaves while one holds focus', () => {
    // The actions are conditionally rendered, so unmounting the focused button on mouse leave
    // would drop the keyboard user's position in the tab order mid-interaction.
    render(<IocBadge value="203.0.113.4" index={0} testSubj="test-ioc-badge" />);
    const wrapper = screen.getByTestId('test-ioc-badge');
    fireEvent.mouseEnter(wrapper.querySelector('.euiBadge') as Element);

    const copy = screen.getByLabelText('Copy');
    copy.focus();
    fireEvent.mouseLeave(wrapper);

    expect(screen.getByLabelText('Copy')).toBeInTheDocument();
    expect(copy).toHaveFocus();
  });

  it('hides the actions on mouse leave when nothing inside has focus', () => {
    render(<IocBadge value="203.0.113.4" index={0} testSubj="test-ioc-badge" />);
    const wrapper = screen.getByTestId('test-ioc-badge');
    fireEvent.mouseEnter(wrapper.querySelector('.euiBadge') as Element);
    expect(screen.getByLabelText('Copy')).toBeInTheDocument();

    fireEvent.mouseLeave(wrapper);

    expect(screen.queryByLabelText('Copy')).not.toBeInTheDocument();
  });
});
