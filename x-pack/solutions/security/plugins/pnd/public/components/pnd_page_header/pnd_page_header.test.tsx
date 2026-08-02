/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { renderWithPndProviders } from '../test_utils/render_with_pnd_providers';
import { PndPageHeader } from '.';

/** Local-time constructor, because the greeting is deliberately about the analyst's own clock. */
const atLocalHour = (hour: number) => new Date(2026, 7, 6, hour, 30, 0);

/**
 * The greeting-and-count assertions here came from `pages/brief/components/brief_header`, which this
 * component replaced when the two queues were collapsed into one: the hero
 * [#284440](https://github.com/elastic/kibana/pull/284440) shipped carries the same greeting and the
 * same headline, so keeping a second one beside it would have been two greetings and one page.
 */
describe('PndPageHeader — the queue hero', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('leads with the sun-in-circle hero', () => {
    renderWithPndProviders(<PndPageHeader eventCount={4} />);

    expect(screen.getByRole('img', { name: 'AlertZero' })).toBeInTheDocument();
  });

  it('greets the morning', () => {
    jest.setSystemTime(atLocalHour(9));

    renderWithPndProviders(<PndPageHeader eventCount={4} />);

    expect(screen.getByTestId('pndPageHeader')).toHaveTextContent('Good morning!');
  });

  it('greets the afternoon', () => {
    jest.setSystemTime(atLocalHour(14));

    renderWithPndProviders(<PndPageHeader eventCount={4} />);

    expect(screen.getByTestId('pndPageHeader')).toHaveTextContent('Good afternoon!');
  });

  it('greets the evening', () => {
    jest.setSystemTime(atLocalHour(21));

    renderWithPndProviders(<PndPageHeader eventCount={4} />);

    expect(screen.getByTestId('pndPageHeader')).toHaveTextContent('Good evening!');
  });

  /**
   * The headline counts **actions**, not events: the naming framework retired "proposal" as a noun and
   * settled on "action" (design decisions 2026-08-11 and 2026-08-12), and several actions can share
   * one thread, so the event wording also over-counted. The message id keeps its bytes.
   */
  it('counts the actions waiting on the analyst', () => {
    renderWithPndProviders(<PndPageHeader eventCount={4} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('4 actions need you');
  });

  it('counts a single action in the singular', () => {
    renderWithPndProviders(<PndPageHeader eventCount={1} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('1 action needs you');
  });

  /** "0 actions need you" reads as a count of a thing; "No actions" reads as the state it is. */
  it('says no action needs the analyst rather than counting zero of them', () => {
    renderWithPndProviders(<PndPageHeader eventCount={0} isQueueEmpty={true} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('No actions need you');
  });

  /** A count is the one thing the header cannot know while the queue is still being read. */
  it('says it is still reading rather than claiming a count it does not have', () => {
    renderWithPndProviders(<PndPageHeader eventCount={0} isLoading={true} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Looking into your data...'
    );
  });

  it('titles the page with the count, so it is the page heading rather than a caption', () => {
    renderWithPndProviders(<PndPageHeader eventCount={4} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveProperty('tagName', 'H1');
  });

  /** The subtitle explaining what the queue is went with the redesign: approvers read it once. */
  it('carries no explanatory subtitle', () => {
    renderWithPndProviders(<PndPageHeader eventCount={4} />);

    expect(screen.getByTestId('pndPageHeader')).not.toHaveTextContent(/one row per/i);
  });

  /** The record is a section of the page now, so the header has nothing to open it with. */
  it('offers no way to open the record, which is no longer an overlay', () => {
    renderWithPndProviders(<PndPageHeader eventCount={4} />);

    expect(screen.queryByTestId('pndBriefOpenHistory')).not.toBeInTheDocument();
  });

  describe('the badge slot', () => {
    it('draws the badge it is given', () => {
      renderWithPndProviders(
        <PndPageHeader badge={<span data-test-subj="pndTestBadge" />} eventCount={4} />
      );

      expect(screen.getByTestId('pndTestBadge')).toBeInTheDocument();
    });

    /**
     * Absent leaves the hero exactly as it rendered before the prop existed. Asserted because the
     * demo badge renders `null` when demo mode is off, which is the default: an emitted-but-empty
     * flex item would put a gap in the hero on every ordinary page load.
     */
    it('emits no trailing item when it is given no badge', () => {
      renderWithPndProviders(<PndPageHeader eventCount={4} />);

      expect(screen.queryByTestId('pndPageHeaderBadge')).not.toBeInTheDocument();
    });
  });

  describe('the titled header, for the routes that name themselves', () => {
    it('renders the title it is given instead of the hero', () => {
      renderWithPndProviders(<PndPageHeader title="Watches" />);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Watches');
    });

    it('draws no greeting beside a title', () => {
      jest.setSystemTime(atLocalHour(9));

      renderWithPndProviders(<PndPageHeader title="Watches" />);

      expect(screen.getByTestId('pndPageHeader')).not.toHaveTextContent('Good morning!');
    });

    it('renders the subtitle beneath the title', () => {
      renderWithPndProviders(<PndPageHeader subtitle="Every managed watch" title="Watches" />);

      expect(screen.getByTestId('pndPageHeader')).toHaveTextContent('Every managed watch');
    });
  });
});
