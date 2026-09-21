/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { IocBadge } from './ioc_badge';

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

  it('shows an Open in Discover action only when a href is provided', () => {
    const { rerender } = render(
      <IocBadge value="203.0.113.4" index={0} testSubj="test-ioc-badge" />
    );
    let badge = screen.getByTestId('test-ioc-badge').querySelector('.euiBadge');
    fireEvent.mouseEnter(badge as Element);
    expect(screen.queryByLabelText('Open in Discover')).not.toBeInTheDocument();

    rerender(
      <IocBadge
        value="203.0.113.4"
        index={0}
        discoverHref="https://kbn.test/discover"
        testSubj="test-ioc-badge"
      />
    );
    badge = screen.getByTestId('test-ioc-badge').querySelector('.euiBadge');
    fireEvent.mouseEnter(badge as Element);
    expect(screen.getByLabelText('Open in Discover')).toBeInTheDocument();
  });

  it('shows an Open entity page action, taking priority over discoverHref, when entityPageHref is provided', () => {
    render(
      <IocBadge
        value="WIN-ANALYST01"
        index={0}
        discoverHref="https://kbn.test/discover"
        entityPageHref="https://kbn.test/app/security/hosts/name/WIN-ANALYST01"
        testSubj="test-ioc-badge"
      />
    );
    const badge = screen.getByTestId('test-ioc-badge').querySelector('.euiBadge');
    fireEvent.mouseEnter(badge as Element);
    expect(screen.getByLabelText('Open entity page')).toBeInTheDocument();
    expect(screen.queryByLabelText('Open in Discover')).not.toBeInTheDocument();
  });

  it('shows an Open alert details action, taking priority over both other hrefs, when alertDetailsHref is provided', () => {
    render(
      <IocBadge
        value="alert-1"
        index={0}
        discoverHref="https://kbn.test/discover"
        entityPageHref="https://kbn.test/app/security/hosts/name/WIN-ANALYST01"
        alertDetailsHref="https://kbn.test/app/security/alerts/redirect/alert-1"
        testSubj="test-ioc-badge"
      />
    );
    const badge = screen.getByTestId('test-ioc-badge').querySelector('.euiBadge');
    fireEvent.mouseEnter(badge as Element);
    expect(screen.getByLabelText('Open alert details')).toBeInTheDocument();
    expect(screen.queryByLabelText('Open entity page')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Open in Discover')).not.toBeInTheDocument();
  });
});
