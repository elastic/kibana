/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import { renderAlertSection, renderAlertsSection } from './summary_rows';

// Stub the lazy flyout opener so it records calls synchronously (no Suspense/lazy boundary).
const mockFlyoutOpener = jest.fn(() => null);
jest.mock('./open_flyout_on_mount', () => ({
  AttachmentSummaryFlyoutOpener: (props: unknown) => mockFlyoutOpener(props),
}));

jest.mock('@kbn/agentic-investigations-common', () => ({
  AttachmentSummaryGroup: ({ title, rows }: { title: string; rows: React.ReactNode[] }) =>
    rows.length === 0 ? null : (
      <div data-test-subj="group" data-title={title}>
        <ul>{rows}</ul>
      </div>
    ),
  AttachmentSummaryRow: ({
    label,
    onClick,
    children,
  }: {
    label: string;
    onClick?: () => void;
    children?: React.ReactNode;
  }) => (
    <li data-test-subj="row" data-label={label}>
      {onClick ? (
        <button type="button" onClick={onClick} data-test-subj="row-button">
          {label}
        </button>
      ) : (
        <span data-test-subj="row-readonly">{label}</span>
      )}
      {children}
    </li>
  ),
  DEFAULT_COLLAPSED_COUNT: 4,
}));

const makeMockBundle = (alertHits: Array<{ _id: string; _source: Record<string, unknown> }>) => ({
  kibanaServices: {
    data: {
      search: {
        search: jest.fn(() =>
          of({
            rawResponse: {
              hits: { hits: alertHits },
            },
          })
        ),
      },
    },
  },
});

const resolveSecurityCanvasContext = jest.fn();
const getSpaceId = jest.fn().mockResolvedValue('default');

const makeAlertAttachment = (data: object): UnknownAttachment => ({
  id: 'att-1',
  type: SecurityAgentBuilderAttachments.alert,
  data,
});

const makeAlertsAttachment = (alertIds: string[]): UnknownAttachment => ({
  id: 'att-1',
  type: SecurityAgentBuilderAttachments.alerts,
  data: { alertIds },
});

const renderSection = (node: React.ReactNode) => render(<>{node}</>);

describe('renderAlertSection', () => {
  beforeEach(() => jest.clearAllMocks());

  it('has exactly one row', () => {
    renderSection(
      renderAlertSection({
        attachment: makeAlertAttachment({ alert: JSON.stringify({ _id: 'a1', _index: '.idx' }) }),
        resolveSecurityCanvasContext,
      })
    );

    expect(screen.getAllByTestId('row')).toHaveLength(1);
  });

  it('is read-only when the attachment has no _id/_index', () => {
    renderSection(
      renderAlertSection({
        attachment: makeAlertAttachment({
          alert: JSON.stringify({ 'kibana.alert.rule.name': 'X' }),
        }),
        resolveSecurityCanvasContext,
      })
    );

    expect(screen.getByTestId('row-readonly')).toBeInTheDocument();
    expect(screen.queryByTestId('row-button')).not.toBeInTheDocument();
  });

  it('uses attachmentLabel as the row label', () => {
    renderSection(
      renderAlertSection({
        attachment: makeAlertAttachment({
          attachmentLabel: 'Suspicious PowerShell',
          alert: JSON.stringify({ _id: 'a1', _index: '.internal.alerts-1' }),
        }),
        resolveSecurityCanvasContext,
      })
    );

    expect(screen.getByTestId('row')).toHaveAttribute('data-label', 'Suspicious PowerShell');
  });

  it('mounts the flyout opener on click', async () => {
    renderSection(
      renderAlertSection({
        attachment: makeAlertAttachment({
          alert: JSON.stringify({ _id: 'a1', _index: '.internal.alerts-1' }),
        }),
        resolveSecurityCanvasContext,
      })
    );

    expect(mockFlyoutOpener).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId('row-button'));

    expect(mockFlyoutOpener).toHaveBeenCalledWith(
      expect.objectContaining({ descriptor: expect.objectContaining({ documentId: 'a1' }) })
    );
  });

  it('remounts the opener on a second click so the flyout reopens', async () => {
    const onMount = jest.fn();
    mockFlyoutOpener.mockImplementation(() => {
      React.useEffect(() => onMount(), []);
      return null;
    });

    renderSection(
      renderAlertSection({
        attachment: makeAlertAttachment({
          alert: JSON.stringify({ _id: 'a1', _index: '.internal.alerts-1' }),
        }),
        resolveSecurityCanvasContext,
      })
    );

    await userEvent.click(screen.getByTestId('row-button'));
    expect(onMount).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByTestId('row-button'));
    expect(onMount).toHaveBeenCalledTimes(2);
  });
});

describe('renderAlertsSection', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns null when alertIds is absent', () => {
    const result = renderAlertsSection({
      attachment: makeAlertsAttachment([]),
      getSpaceId,
      resolveSecurityCanvasContext,
    });

    expect(result).toBeNull();
  });

  it('renders a skeleton while the fetch is in flight', () => {
    // resolveSecurityCanvasContext never resolves, simulating in-flight fetch.
    resolveSecurityCanvasContext.mockReturnValue(new Promise(() => {}));

    renderSection(
      renderAlertsSection({
        attachment: makeAlertsAttachment(['id-1', 'id-2', 'id-3']),
        getSpaceId,
        resolveSecurityCanvasContext,
      })
    );

    expect(screen.getByTestId('attachmentSummaryGroupSkeleton')).toBeInTheDocument();
  });

  it('shows the resolved rule name as the row label', async () => {
    resolveSecurityCanvasContext.mockResolvedValue(
      makeMockBundle([{ _id: 'id-1', _source: { 'kibana.alert.rule.name': 'Impossible travel' } }])
    );

    renderSection(
      renderAlertsSection({
        attachment: makeAlertsAttachment(['id-1']),
        getSpaceId,
        resolveSecurityCanvasContext,
      })
    );

    await waitFor(() => expect(screen.getByText('Impossible travel')).toBeInTheDocument());
  });

  it('drops alert IDs that ES did not return', async () => {
    resolveSecurityCanvasContext.mockResolvedValue(
      makeMockBundle([
        { _id: 'id-1', _source: { 'kibana.alert.rule.name': 'Found' } },
        // id-2 is missing from the response
      ])
    );

    renderSection(
      renderAlertsSection({
        attachment: makeAlertsAttachment(['id-1', 'id-2']),
        getSpaceId,
        resolveSecurityCanvasContext,
      })
    );

    await waitFor(() => expect(screen.getAllByTestId('row')).toHaveLength(1));
    expect(screen.getByText('Found')).toBeInTheDocument();
  });

  it('renders nothing when no alerts resolve', async () => {
    resolveSecurityCanvasContext.mockResolvedValue(makeMockBundle([]));

    const { container } = renderSection(
      renderAlertsSection({
        attachment: makeAlertsAttachment(['id-1']),
        getSpaceId,
        resolveSecurityCanvasContext,
      })
    );

    await waitFor(() =>
      // Group is only rendered when rows.length > 0
      expect(container).toBeEmptyDOMElement()
    );
  });

  it('sorts rows critical-first', async () => {
    resolveSecurityCanvasContext.mockResolvedValue(
      makeMockBundle([
        {
          _id: 'low-id',
          _source: { 'kibana.alert.rule.name': 'Low alert', 'kibana.alert.severity': 'low' },
        },
        {
          _id: 'crit-id',
          _source: {
            'kibana.alert.rule.name': 'Critical alert',
            'kibana.alert.severity': 'critical',
          },
        },
        {
          _id: 'med-id',
          _source: { 'kibana.alert.rule.name': 'Medium alert', 'kibana.alert.severity': 'medium' },
        },
      ])
    );

    renderSection(
      renderAlertsSection({
        attachment: makeAlertsAttachment(['low-id', 'crit-id', 'med-id']),
        getSpaceId,
        resolveSecurityCanvasContext,
      })
    );

    const labels = await waitFor(() => {
      const rows = screen.getAllByTestId('row');
      expect(rows).toHaveLength(3);
      return rows.map((el) => el.getAttribute('data-label'));
    });

    expect(labels).toEqual(['Critical alert', 'Medium alert', 'Low alert']);
  });

  it('each row opens a descriptor scoped to its own alert id on click', async () => {
    resolveSecurityCanvasContext.mockResolvedValue(
      makeMockBundle([
        { _id: 'id-1', _source: { 'kibana.alert.rule.name': 'Rule A' } },
        { _id: 'id-2', _source: { 'kibana.alert.rule.name': 'Rule B' } },
      ])
    );

    renderSection(
      renderAlertsSection({
        attachment: makeAlertsAttachment(['id-1', 'id-2']),
        getSpaceId,
        resolveSecurityCanvasContext,
      })
    );

    await waitFor(() => expect(screen.getAllByTestId('row-button')).toHaveLength(2));

    await userEvent.click(screen.getAllByTestId('row-button')[0]);

    await waitFor(() =>
      expect(mockFlyoutOpener).toHaveBeenCalledWith(
        expect.objectContaining({ descriptor: expect.objectContaining({ documentId: 'id-1' }) })
      )
    );
  });

  it('does not start the fetch before the component mounts', () => {
    resolveSecurityCanvasContext.mockResolvedValue(makeMockBundle([]));

    renderAlertsSection({
      attachment: makeAlertsAttachment(['id-1']),
      getSpaceId,
      resolveSecurityCanvasContext,
    });

    // factory called, but no component mounted yet — context not resolved
    expect(resolveSecurityCanvasContext).not.toHaveBeenCalled();
  });

  it('renders nothing when the fetch throws', async () => {
    resolveSecurityCanvasContext.mockRejectedValue(new Error('network error'));

    const { container } = renderSection(
      renderAlertsSection({
        attachment: makeAlertsAttachment(['id-1']),
        getSpaceId,
        resolveSecurityCanvasContext,
      })
    );

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
