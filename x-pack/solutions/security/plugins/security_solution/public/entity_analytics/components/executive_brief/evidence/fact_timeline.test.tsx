/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { briefFixture, evidenceFixture } from '../__fixtures__/brief_fixture';
import { renderBrief } from '../__fixtures__/render_brief';
import { FactTimeline } from './fact_timeline';
import { getKeyEventFacts } from './resolve';

jest.mock('../../../../common/hooks/use_is_new_flyout_enabled', () => ({
  useIsNewFlyoutEnabled: () => true,
}));
jest.mock('../../../../flyout_v2/use_flyout_api', () => ({
  useFlyoutApi: () => ({ openEntityFlyout: jest.fn(), openRuleFlyout: jest.fn() }),
}));
jest.mock('../../../../common/components/links', () => ({
  CaseDetailsLink: ({ children }: { children: React.ReactNode }) => <a href="#case">{children}</a>,
}));

// Seven key events in time order: F-2, F-3, F-1, F-8, F-4, F-5, F-6.
const facts = getKeyEventFacts(briefFixture.threats[0], evidenceFixture);

describe('FactTimeline', () => {
  it('shows the first two and latest two events with a gap item', () => {
    renderBrief(<FactTimeline facts={facts} />);

    ['F-2', 'F-3', 'F-5', 'F-6'].forEach((id) =>
      expect(screen.getByTestId(`executiveBriefEvent-${id}`)).toBeInTheDocument()
    );
    ['F-1', 'F-8', 'F-4'].forEach((id) =>
      expect(screen.queryByTestId(`executiveBriefEvent-${id}`)).not.toBeInTheDocument()
    );
    expect(screen.getByTestId('executiveBriefStepsShowAll')).toHaveTextContent(
      'Show 3 more events'
    );
  });

  it('expands to every event and collapses again', () => {
    renderBrief(<FactTimeline facts={facts} />);

    fireEvent.click(screen.getByTestId('executiveBriefStepsShowAll'));

    facts.forEach(({ id }) =>
      expect(screen.getByTestId(`executiveBriefEvent-${id}`)).toBeInTheDocument()
    );
    expect(screen.queryByTestId('executiveBriefStepsShowAll')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('executiveBriefStepsShowFewer'));

    expect(screen.queryByTestId('executiveBriefEvent-F-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('executiveBriefStepsShowAll')).toBeInTheDocument();
  });

  it('does not truncate when hiding would save a single event', () => {
    renderBrief(<FactTimeline facts={facts.slice(0, 5)} />);

    expect(screen.queryByTestId('executiveBriefStepsShowAll')).not.toBeInTheDocument();
    expect(screen.getAllByTestId(/^executiveBriefEvent-F-/)).toHaveLength(5);
  });

  it('shows the time, tactics and a rule fact as its chip', () => {
    renderBrief(<FactTimeline facts={facts.slice(0, 4)} />);

    expect(
      screen
        .getByTestId('executiveBriefEvent-F-3')
        .querySelector('[data-test-subj="executiveBriefEventTime"]')
    ).toHaveTextContent('2026-10-09 10:00Z');
    expect(screen.getByTestId('executiveBriefEvent-F-2')).toHaveTextContent('Initial Access');
    expect(screen.getByTestId('executiveBriefRuleChip')).toBeInTheDocument();
  });

  it('shows every event without toggles when there are no actions', () => {
    renderBrief(<FactTimeline facts={facts} />, null);

    expect(screen.getAllByTestId(/^executiveBriefEvent-F-/)).toHaveLength(7);
    expect(screen.queryByTestId('executiveBriefStepsShowAll')).not.toBeInTheDocument();
    expect(screen.queryByTestId('executiveBriefStepsShowFewer')).not.toBeInTheDocument();
  });

  it('renders nothing without facts', () => {
    const { container } = renderBrief(<FactTimeline facts={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
