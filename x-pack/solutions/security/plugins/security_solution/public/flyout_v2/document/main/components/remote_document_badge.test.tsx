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
import { REMOTE_DOCUMENT_BADGE_TEST_ID, RemoteDocumentBadge } from './remote_document_badge';

let mockCloud: unknown;
jest.mock('../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      cloud: mockCloud,
    },
  }),
}));

const makeHit = (raw: DataTableRecord['raw'], flattened: DataTableRecord['flattened'] = {}) =>
  ({ id: '1', raw, flattened, isAnchor: false } as DataTableRecord);

const renderBadge = (props: React.ComponentProps<typeof RemoteDocumentBadge>) =>
  render(
    <IntlProvider locale="en">
      <RemoteDocumentBadge {...props} />
    </IntlProvider>
  );

describe('<RemoteDocumentBadge />', () => {
  beforeEach(() => {
    mockCloud = { isServerlessEnabled: false };
  });

  it('renders nothing for a local document', () => {
    const { container } = renderBadge({
      hit: makeHit({ _index: '.alerts-security.alerts-default' }),
    });

    expect(container).toBeEmptyDOMElement();
  });

  describe('CCS (on-prem remote cluster)', () => {
    it('renders "Remote alert" badge for a remote alert via raw._index', () => {
      const { getByTestId, getByText } = renderBadge({
        hit: makeHit(
          { _index: 'remote-cluster:.alerts-security.alerts-default' },
          { 'event.kind': 'signal' }
        ),
      });

      expect(getByTestId(REMOTE_DOCUMENT_BADGE_TEST_ID)).toBeInTheDocument();
      expect(getByText('Remote alert')).toBeInTheDocument();
    });

    it('renders "Remote event" badge for a remote event via raw._index', () => {
      const { getByTestId, getByText } = renderBadge({
        hit: makeHit({ _index: 'remote-cluster:logs-system-default' }, { 'event.kind': 'event' }),
      });

      expect(getByTestId(REMOTE_DOCUMENT_BADGE_TEST_ID)).toBeInTheDocument();
      expect(getByText('Remote event')).toBeInTheDocument();
    });

    it('renders "Remote attack" badge for a remote scheduled attack discovery alert', () => {
      const { getByTestId, getByText } = renderBadge({
        hit: makeHit(
          { _index: 'remote-cluster:.alerts-security.alerts-default' },
          {
            'event.kind': 'signal',
            [ALERT_RULE_TYPE_ID]: ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
          }
        ),
      });

      expect(getByTestId(REMOTE_DOCUMENT_BADGE_TEST_ID)).toBeInTheDocument();
      expect(getByText('Remote attack')).toBeInTheDocument();
    });

    it('renders "Remote attack" badge for a remote ad-hoc attack discovery alert', () => {
      const { getByTestId, getByText } = renderBadge({
        hit: makeHit(
          { _index: 'remote-cluster:.alerts-security.alerts-default' },
          {
            'event.kind': 'signal',
            [ALERT_RULE_TYPE_ID]: ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID,
          }
        ),
      });

      expect(getByTestId(REMOTE_DOCUMENT_BADGE_TEST_ID)).toBeInTheDocument();
      expect(getByText('Remote attack')).toBeInTheDocument();
    });

    it('renders the badge for a remote document via flattened _index (raw absent)', () => {
      const { getByTestId } = renderBadge({
        hit: makeHit({}, { _index: 'remote-cluster:logs-system-default', 'event.kind': 'event' }),
      });

      expect(getByTestId(REMOTE_DOCUMENT_BADGE_TEST_ID)).toBeInTheDocument();
    });
  });

  describe('CPS (serverless linked project)', () => {
    beforeEach(() => {
      mockCloud = { isServerlessEnabled: true };
    });

    it('renders "Linked project alert" badge for a remote alert', () => {
      const { getByTestId, getByText } = renderBadge({
        hit: makeHit(
          { _index: 'remote-cluster:.alerts-security.alerts-default' },
          { 'event.kind': 'signal' }
        ),
      });

      expect(getByTestId(REMOTE_DOCUMENT_BADGE_TEST_ID)).toBeInTheDocument();
      expect(getByText('Linked project alert')).toBeInTheDocument();
    });

    it('renders "Linked project event" badge for a remote event', () => {
      const { getByTestId, getByText } = renderBadge({
        hit: makeHit({ _index: 'remote-cluster:logs-system-default' }, { 'event.kind': 'event' }),
      });

      expect(getByTestId(REMOTE_DOCUMENT_BADGE_TEST_ID)).toBeInTheDocument();
      expect(getByText('Linked project event')).toBeInTheDocument();
    });

    it('renders "Linked project attack" badge for a remote scheduled attack discovery alert', () => {
      const { getByTestId, getByText } = renderBadge({
        hit: makeHit(
          { _index: 'remote-cluster:.alerts-security.alerts-default' },
          {
            'event.kind': 'signal',
            [ALERT_RULE_TYPE_ID]: ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
          }
        ),
      });

      expect(getByTestId(REMOTE_DOCUMENT_BADGE_TEST_ID)).toBeInTheDocument();
      expect(getByText('Linked project attack')).toBeInTheDocument();
    });

    it('renders "Linked project attack" badge for a remote ad-hoc attack discovery alert', () => {
      const { getByTestId, getByText } = renderBadge({
        hit: makeHit(
          { _index: 'remote-cluster:.alerts-security.alerts-default' },
          {
            'event.kind': 'signal',
            [ALERT_RULE_TYPE_ID]: ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID,
          }
        ),
      });

      expect(getByTestId(REMOTE_DOCUMENT_BADGE_TEST_ID)).toBeInTheDocument();
      expect(getByText('Linked project attack')).toBeInTheDocument();
    });
  });
});
