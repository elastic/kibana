/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { decode } from '@kbn/rison';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import type { ApplicationStart } from '@kbn/core-application-browser';
import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import { toAlertDescriptor, AlertsPill } from './alert_pills';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const attachmentOf = (type: string, data: unknown): UnknownAttachment => ({
  id: 'attachment-1',
  type,
  data,
});

/** `stringifyEssentialAlertData` writes each value as an array. */
const alertAttachment = (fields: Record<string, unknown>) =>
  attachmentOf(SecurityAgentBuilderAttachments.alert, { alert: JSON.stringify(fields) });

const makeAlertsAttachment = (alertIds: string[]): UnknownAttachment => ({
  id: 'attachment-1',
  type: SecurityAgentBuilderAttachments.alerts,
  data: { alertIds },
  versionData: {
    version: 1,
    versionCount: 1,
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
});

const resolveSecurityCanvasContext = jest.fn();
const getSpaceId = jest.fn().mockResolvedValue('default');
const mockGetUrlForApp = jest.fn((appId: string, { path }: { path?: string } = {}) => path ?? '');
const application = { getUrlForApp: mockGetUrlForApp } as unknown as ApplicationStart;

// ---------------------------------------------------------------------------
// toAlertDescriptor — ported from main's attachment_summary_drilldown tests
// ---------------------------------------------------------------------------

describe('toAlertDescriptor', () => {
  it('opens the document flyout for the alert the payload names', () => {
    const descriptor = toAlertDescriptor(
      alertAttachment({
        _id: ['alert-1'],
        _index: ['.internal.alerts-security.alerts-default-000001'],
        'kibana.alert.rule.name': ['Endpoint Security'],
      })
    );

    expect(descriptor).toEqual({
      kind: 'document',
      documentId: 'alert-1',
      indexName: '.internal.alerts-security.alerts-default-000001',
    });
  });

  it('accepts scalar fields, since the payload is whatever the producer wrote', () => {
    const descriptor = toAlertDescriptor(
      alertAttachment({ _id: 'alert-1', _index: '.internal.alerts-1' })
    );

    expect(descriptor).toEqual({
      kind: 'document',
      documentId: 'alert-1',
      indexName: '.internal.alerts-1',
    });
  });

  it.each([
    ['the id is missing', { _index: ['.internal.alerts-1'] }],
    ['the index is missing', { _id: ['alert-1'] }],
  ])('returns null when %s', (_, fields) => {
    expect(toAlertDescriptor(alertAttachment(fields))).toBeNull();
  });

  it.each([
    ['the payload is prose rather than JSON', { alert: 'Alert 04784eda — Suspicious activity' }],
    ['the payload is markdown', { alert: '## Attack discovery\n\nA host was compromised.' }],
    ['the JSON does not parse', { alert: '{' }],
    ['the JSON is not an object', { alert: '"just a string"' }],
    ['there is no alert at all', {}],
    ['the alert is not a string', { alert: { _id: 'alert-1' } }],
  ])('returns null when %s', (_, data) => {
    expect(toAlertDescriptor(attachmentOf(SecurityAgentBuilderAttachments.alert, data))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// AlertsPill — component behaviour
// ---------------------------------------------------------------------------

describe('AlertsPill', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when alertIds is empty', () => {
    const { container } = render(
      <AlertsPill
        attachment={makeAlertsAttachment([])}
        application={application}
        getSpaceId={getSpaceId}
        resolveSecurityCanvasContext={resolveSecurityCanvasContext}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders a badge for a single alert', () => {
    render(
      <AlertsPill
        attachment={makeAlertsAttachment(['alert-1'])}
        application={application}
        getSpaceId={getSpaceId}
        resolveSecurityCanvasContext={resolveSecurityCanvasContext}
      />
    );

    expect(screen.getByText('1 alert')).toBeInTheDocument();
  });

  it('renders a link badge for multiple alerts', () => {
    render(
      <AlertsPill
        attachment={makeAlertsAttachment(['alert-1', 'alert-2', 'alert-3'])}
        application={application}
        getSpaceId={getSpaceId}
        resolveSecurityCanvasContext={resolveSecurityCanvasContext}
      />
    );

    expect(screen.getByText('3 alerts')).toBeInTheDocument();
  });

  it('multi-alert href includes the _id filter for all ids', () => {
    render(
      <AlertsPill
        attachment={makeAlertsAttachment(['alert-1', 'alert-2'])}
        application={application}
        getSpaceId={getSpaceId}
        resolveSecurityCanvasContext={resolveSecurityCanvasContext}
      />
    );

    const path = (mockGetUrlForApp.mock.calls[0][1] as { path: string }).path;
    const params = new URLSearchParams(path.replace(/^\?/, ''));

    const filters = decode(params.get('filters')!) as Array<{
      query?: { bool?: { filter?: { ids?: { values?: string[] } } } };
    }>;
    expect(filters[0].query?.bool?.filter?.ids?.values).toEqual(['alert-1', 'alert-2']);
  });

  it('multi-alert href includes all workflow statuses', () => {
    render(
      <AlertsPill
        attachment={makeAlertsAttachment(['alert-1', 'alert-2'])}
        application={application}
        getSpaceId={getSpaceId}
        resolveSecurityCanvasContext={resolveSecurityCanvasContext}
      />
    );

    const path = (mockGetUrlForApp.mock.calls[0][1] as { path: string }).path;
    const params = new URLSearchParams(path.replace(/^\?/, ''));

    const pageFilter = decode(params.get('pageFilters')!) as Array<{
      field_name: string;
      selected_options: string[];
    }>;
    expect(pageFilter[0].selected_options).toEqual([
      'open',
      'acknowledged',
      'in-progress',
      'closed',
    ]);
  });

  it('multi-alert href timerange upper bound is about 1 hour from now', () => {
    const before = Date.now();

    render(
      <AlertsPill
        attachment={makeAlertsAttachment(['alert-1', 'alert-2'])}
        application={application}
        getSpaceId={getSpaceId}
        resolveSecurityCanvasContext={resolveSecurityCanvasContext}
      />
    );

    const after = Date.now();
    const path = (mockGetUrlForApp.mock.calls[0][1] as { path: string }).path;
    const params = new URLSearchParams(path.replace(/^\?/, ''));

    const timerange = decode(params.get('timerange')!) as {
      global: { timerange: { to: string } };
    };
    const to = new Date(timerange.global.timerange.to).getTime();

    expect(to).toBeGreaterThanOrEqual(before + 60 * 60 * 1000 - 1000);
    expect(to).toBeLessThanOrEqual(after + 60 * 60 * 1000 + 1000);
  });
});
