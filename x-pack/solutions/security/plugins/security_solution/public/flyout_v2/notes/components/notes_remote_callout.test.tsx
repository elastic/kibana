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
import {
  LINKED_PROJECT_ATTACK_NOTES_MESSAGE,
  LINKED_PROJECT_EVENT_NOTES_MESSAGE,
  LINKED_PROJECT_NOTES_MESSAGE,
  NotesRemoteCallout,
  REMOTE_CLUSTER_ATTACK_NOTES_MESSAGE,
  REMOTE_CLUSTER_EVENT_NOTES_MESSAGE,
  REMOTE_CLUSTER_NOTES_MESSAGE,
} from './notes_remote_callout';

let mockCloud: unknown;
jest.mock('../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      cloud: mockCloud,
    },
  }),
}));

const makeHit = (index: string, flattened: DataTableRecord['flattened'] = {}): DataTableRecord =>
  ({
    id: '1',
    raw: { _index: index },
    flattened: { _index: index, ...flattened },
    isAnchor: false,
  } as DataTableRecord);

const renderCallout = (hit: DataTableRecord) =>
  render(
    <IntlProvider locale="en">
      <NotesRemoteCallout hit={hit} />
    </IntlProvider>
  );

describe('<NotesRemoteCallout />', () => {
  beforeEach(() => {
    mockCloud = undefined;
  });

  it('renders nothing for a local document', () => {
    const { container } = renderCallout(
      makeHit('.alerts-security.alerts-default', { 'event.kind': 'signal' })
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('does not render children for a local document', () => {
    const { queryByText } = render(
      <IntlProvider locale="en">
        <NotesRemoteCallout hit={makeHit('.alerts-security.alerts-default')}>
          <span>{'child content'}</span>
        </NotesRemoteCallout>
      </IntlProvider>
    );

    expect(queryByText('child content')).not.toBeInTheDocument();
  });

  it('renders children after the callout for a remote document', () => {
    const { getByText } = render(
      <IntlProvider locale="en">
        <NotesRemoteCallout
          hit={makeHit('remote-cluster:.alerts-security.alerts-default', {
            'event.kind': 'signal',
          })}
        >
          <span>{'child content'}</span>
        </NotesRemoteCallout>
      </IntlProvider>
    );

    expect(getByText(REMOTE_CLUSTER_NOTES_MESSAGE)).toBeInTheDocument();
    expect(getByText('child content')).toBeInTheDocument();
  });

  describe('CCS (on-prem remote cluster)', () => {
    it('renders the alert message for a remote alert', () => {
      const { getByText } = renderCallout(
        makeHit('remote-cluster:.alerts-security.alerts-default', { 'event.kind': 'signal' })
      );

      expect(getByText(REMOTE_CLUSTER_NOTES_MESSAGE)).toBeInTheDocument();
    });

    it('renders the event message for a remote event', () => {
      const { getByText } = renderCallout(
        makeHit('remote-cluster:logs-system-default', { 'event.kind': 'event' })
      );

      expect(getByText(REMOTE_CLUSTER_EVENT_NOTES_MESSAGE)).toBeInTheDocument();
    });

    it('renders the attack message for a remote scheduled attack discovery alert', () => {
      const { getByText } = renderCallout(
        makeHit('remote-cluster:.alerts-security.alerts-default', {
          'event.kind': 'signal',
          [ALERT_RULE_TYPE_ID]: ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
        })
      );

      expect(getByText(REMOTE_CLUSTER_ATTACK_NOTES_MESSAGE)).toBeInTheDocument();
    });

    it('renders the attack message for a remote ad-hoc attack discovery alert', () => {
      const { getByText } = renderCallout(
        makeHit('remote-cluster:.alerts-security.alerts-default', {
          'event.kind': 'signal',
          [ALERT_RULE_TYPE_ID]: ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID,
        })
      );

      expect(getByText(REMOTE_CLUSTER_ATTACK_NOTES_MESSAGE)).toBeInTheDocument();
    });
  });

  describe('CPS (serverless linked project)', () => {
    beforeEach(() => {
      mockCloud = { isServerlessEnabled: true };
    });

    it('renders the alert message for a remote alert', () => {
      const { getByText } = renderCallout(
        makeHit('remote-cluster:.alerts-security.alerts-default', { 'event.kind': 'signal' })
      );

      expect(getByText(LINKED_PROJECT_NOTES_MESSAGE)).toBeInTheDocument();
    });

    it('renders the event message for a remote event', () => {
      const { getByText } = renderCallout(
        makeHit('remote-cluster:logs-system-default', { 'event.kind': 'event' })
      );

      expect(getByText(LINKED_PROJECT_EVENT_NOTES_MESSAGE)).toBeInTheDocument();
    });

    it('renders the attack message for a remote scheduled attack discovery alert', () => {
      const { getByText } = renderCallout(
        makeHit('remote-cluster:.alerts-security.alerts-default', {
          'event.kind': 'signal',
          [ALERT_RULE_TYPE_ID]: ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
        })
      );

      expect(getByText(LINKED_PROJECT_ATTACK_NOTES_MESSAGE)).toBeInTheDocument();
    });

    it('renders the attack message for a remote ad-hoc attack discovery alert', () => {
      const { getByText } = renderCallout(
        makeHit('remote-cluster:.alerts-security.alerts-default', {
          'event.kind': 'signal',
          [ALERT_RULE_TYPE_ID]: ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID,
        })
      );

      expect(getByText(LINKED_PROJECT_ATTACK_NOTES_MESSAGE)).toBeInTheDocument();
    });
  });
});
