/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import {
  ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID,
  ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
} from '@kbn/elastic-assistant-common';
import { ALERT_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { RemoteDocumentCallout } from './remote_document_callout';

let mockCloud: unknown;
jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      cloud: mockCloud,
    },
  }),
}));

const REMOTE_ATTACK_TEXT =
  'This attack originates from a remote cluster. Some features may not be available.';
const REMOTE_ALERT_TEXT =
  'This alert originates from a remote cluster. Some features may not be available.';
const REMOTE_EVENT_TEXT =
  'This event originates from a remote cluster. Some features may not be available.';

const LINKED_PROJECT_ATTACK_TEXT =
  'This attack originates from a linked project. Some features may not be available.';
const LINKED_PROJECT_ALERT_TEXT =
  'This alert originates from a linked project. Some features may not be available.';
const LINKED_PROJECT_EVENT_TEXT =
  'This event originates from a linked project. Some features may not be available.';

const makeHit = (raw: DataTableRecord['raw'], flattened: DataTableRecord['flattened'] = {}) =>
  ({ id: '1', raw, flattened, isAnchor: false } as DataTableRecord);

const renderCallout = (props: React.ComponentProps<typeof RemoteDocumentCallout>) =>
  render(
    <IntlProvider locale="en">
      <RemoteDocumentCallout {...props} />
    </IntlProvider>
  );

describe('<RemoteDocumentCallout />', () => {
  beforeEach(() => {
    mockCloud = { isServerlessEnabled: false };
  });

  it('renders nothing for a local document', () => {
    const { container } = renderCallout({
      hit: makeHit({ _index: '.alerts-security.alerts-default' }),
    });

    expect(container).toBeEmptyDOMElement();
  });

  it('does not render children for a local document', () => {
    const { queryByText } = renderCallout({
      hit: makeHit({ _index: 'local-index' }),
      children: <span>{'child content'}</span>,
    });

    expect(queryByText('child content')).not.toBeInTheDocument();
  });

  describe('CCS (on-prem remote cluster)', () => {
    it('renders the alert callout for a remote alert via raw._index', () => {
      const { getByText } = renderCallout({
        hit: makeHit(
          { _index: 'remote-cluster:.alerts-security.alerts-default' },
          { 'event.kind': 'signal' }
        ),
      });

      expect(getByText(REMOTE_ALERT_TEXT)).toBeInTheDocument();
    });

    it('renders the event callout for a remote event', () => {
      const { getByText } = renderCallout({
        hit: makeHit({ _index: 'remote-cluster:logs-system-default' }, { 'event.kind': 'event' }),
      });

      expect(getByText(REMOTE_EVENT_TEXT)).toBeInTheDocument();
    });

    it('renders the attack callout for a remote scheduled attack discovery alert', () => {
      const { getByText } = renderCallout({
        hit: makeHit(
          { _index: 'remote-cluster:.alerts-security.alerts-default' },
          {
            'event.kind': 'signal',
            [ALERT_RULE_TYPE_ID]: ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
          }
        ),
      });

      expect(getByText(REMOTE_ATTACK_TEXT)).toBeInTheDocument();
    });

    it('renders the attack callout for a remote ad-hoc attack discovery alert', () => {
      const { getByText } = renderCallout({
        hit: makeHit(
          { _index: 'remote-cluster:.alerts-security.alerts-default' },
          {
            'event.kind': 'signal',
            [ALERT_RULE_TYPE_ID]: ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID,
          }
        ),
      });

      expect(getByText(REMOTE_ATTACK_TEXT)).toBeInTheDocument();
    });

    it('renders the callout for a remote document via flattened _index (raw absent)', () => {
      const { getByText } = renderCallout({
        hit: makeHit({}, { _index: 'remote-cluster:logs-system-default', 'event.kind': 'event' }),
      });

      expect(getByText(REMOTE_EVENT_TEXT)).toBeInTheDocument();
    });

    it('renders children after the callout for a remote document', () => {
      const { getByText } = renderCallout({
        hit: makeHit(
          { _index: 'remote-cluster:.alerts-security.alerts-default' },
          { 'event.kind': 'signal' }
        ),
        children: <span>{'child content'}</span>,
      });

      expect(getByText(REMOTE_ALERT_TEXT)).toBeInTheDocument();
      expect(getByText('child content')).toBeInTheDocument();
    });
  });

  describe('CPS (serverless linked project)', () => {
    beforeEach(() => {
      mockCloud = { isServerlessEnabled: true };
    });

    it('renders the linked project alert callout for a remote alert', () => {
      const { getByText } = renderCallout({
        hit: makeHit(
          { _index: 'remote-cluster:.alerts-security.alerts-default' },
          { 'event.kind': 'signal' }
        ),
      });

      expect(getByText(LINKED_PROJECT_ALERT_TEXT)).toBeInTheDocument();
    });

    it('renders the linked project event callout for a remote event', () => {
      const { getByText } = renderCallout({
        hit: makeHit({ _index: 'remote-cluster:logs-system-default' }, { 'event.kind': 'event' }),
      });

      expect(getByText(LINKED_PROJECT_EVENT_TEXT)).toBeInTheDocument();
    });

    it('renders the linked project attack callout for a remote scheduled attack discovery alert', () => {
      const { getByText } = renderCallout({
        hit: makeHit(
          { _index: 'remote-cluster:.alerts-security.alerts-default' },
          {
            'event.kind': 'signal',
            [ALERT_RULE_TYPE_ID]: ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
          }
        ),
      });

      expect(getByText(LINKED_PROJECT_ATTACK_TEXT)).toBeInTheDocument();
    });

    it('renders the linked project attack callout for a remote ad-hoc attack discovery alert', () => {
      const { getByText } = renderCallout({
        hit: makeHit(
          { _index: 'remote-cluster:.alerts-security.alerts-default' },
          {
            'event.kind': 'signal',
            [ALERT_RULE_TYPE_ID]: ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID,
          }
        ),
      });

      expect(getByText(LINKED_PROJECT_ATTACK_TEXT)).toBeInTheDocument();
    });

    it('renders children after the callout for a remote document', () => {
      const { getByText } = renderCallout({
        hit: makeHit(
          { _index: 'remote-cluster:.alerts-security.alerts-default' },
          { 'event.kind': 'signal' }
        ),
        children: <span>{'child content'}</span>,
      });

      expect(getByText(LINKED_PROJECT_ALERT_TEXT)).toBeInTheDocument();
      expect(getByText('child content')).toBeInTheDocument();
    });
  });
});
