/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';

import { TestProviders } from '../../../../../../common/mock';
import type { ThreatMatchRowProps } from './threat_match_row';
import { ThreatMatchRowView } from './threat_match_row';

jest.mock('../../../../../../common/lib/kibana');

describe('ThreatMatchRowView', () => {
  it('renders an indicator match row', () => {
    rtlRender(
      <TestProviders>
        <ThreatMatchRowView
          scopeId="some_scope"
          contextId="contextId"
          eventId="eventId"
          feedName="feedName"
          indicatorReference="http://example.com"
          indicatorType="domain"
          sourceField="host.name"
          sourceValue="http://elastic.co"
        />
      </TestProviders>
    );

    expect(screen.getByTestId('threat-match-row')).toBeInTheDocument();
    expect(screen.getByTestId('threat-match-details')).toBeInTheDocument();
    expect(screen.getByTestId('threat-match-indicator-details')).toBeInTheDocument();
  });

  describe('field rendering', () => {
    let baseProps: ThreatMatchRowProps;
    const render = (props: ThreatMatchRowProps) =>
      rtlRender(
        <TestProviders>
          <ThreatMatchRowView {...props} />
        </TestProviders>
      );

    beforeEach(() => {
      baseProps = {
        scopeId: 'some_scope',
        contextId: 'contextId',
        eventId: 'eventId',
        feedName: 'feedName',
        indicatorReference: 'http://example.com',
        indicatorType: 'domain',
        sourceField: 'host.name',
        sourceValue: 'http://elastic.co',
      };
    });

    it('renders the match field', () => {
      render(baseProps);
      expect(
        screen.getByTestId('render-content-threat.enrichments.matched.field')
      ).toHaveTextContent('host.name');
    });

    it('renders the match value', () => {
      render(baseProps);
      expect(screen.getByTestId('render-content-host.name')).toHaveTextContent('http://elastic.co');
    });

    it('renders the indicator type, if present', () => {
      render(baseProps);
      expect(
        screen.getByTestId('render-content-threat.enrichments.matched.type')
      ).toHaveTextContent('domain');
    });

    it('does not render the indicator type, if absent', () => {
      render({
        ...baseProps,
        indicatorType: undefined,
      });
      expect(
        screen.queryByTestId('render-content-threat.enrichments.matched.type')
      ).not.toBeInTheDocument();
    });

    it('renders the feed name, if present', () => {
      render(baseProps);
      expect(screen.getByTestId('render-content-feed.name')).toHaveTextContent('feedName');
    });

    it('does not render the indicator provider, if absent', () => {
      render({
        ...baseProps,
        feedName: undefined,
      });
      expect(screen.queryByTestId('render-content-feed.name')).not.toBeInTheDocument();
    });

    it('renders the indicator reference, if present', () => {
      render(baseProps);
      expect(screen.getByRole('link')).toHaveAttribute('href', 'http://example.com');
    });

    it('does not render the indicator reference, if absent', () => {
      render({
        ...baseProps,
        indicatorReference: undefined,
      });
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });
});
