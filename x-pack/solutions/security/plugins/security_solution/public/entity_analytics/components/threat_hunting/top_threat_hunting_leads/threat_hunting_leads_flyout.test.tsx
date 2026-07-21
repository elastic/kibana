/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render as rtlRender, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { ThreatHuntingLeadsFlyout } from './threat_hunting_leads_flyout';
import type { HuntingLead } from './types';

const render = (ui: React.ReactElement) => rtlRender(ui, { wrapper: I18nProvider });

jest.mock('@kbn/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('../../../api/api', () => ({
  useEntityAnalyticsRoutes: jest.fn(),
}));

const mockOpenFlyout = jest.fn();
jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: () => ({
    openFlyout: mockOpenFlyout,
  }),
}));

const mockGetRedirectUrl = jest.fn().mockResolvedValue('https://kibana.test/app/discover#/');
const mockLocatorsGet = jest.fn().mockReturnValue({ getRedirectUrl: mockGetRedirectUrl });
jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      share: {
        url: {
          locators: {
            get: mockLocatorsGet,
          },
        },
      },
    },
  }),
  useDateFormat: jest.fn(() => 'MMM D, YYYY @ HH:mm:ss.SSS'),
  useTimeZone: jest.fn(() => 'UTC'),
}));

jest.mock('../../../../common/hooks/use_space_id', () => ({
  useSpaceId: jest.fn(() => 'default'),
}));

const mockUseQuery = jest.requireMock('@kbn/react-query').useQuery as jest.Mock;
const mockUseEntityAnalyticsRoutes = jest.requireMock('../../../api/api')
  .useEntityAnalyticsRoutes as jest.Mock;

const createMockLead = (overrides: Partial<HuntingLead> = {}): HuntingLead => ({
  id: 'lead-1',
  title: 'Test Lead',
  byline: 'Test byline',
  description: 'Test description',
  entities: [{ type: 'user', name: 'jsmith' }],
  tags: ['tag1'],
  priority: 8,
  chatRecommendations: ['Check logs'],
  timestamp: '2026-03-01T00:00:00.000Z',
  staleness: 'fresh' as const,
  status: 'active' as const,
  observations: [],
  sourceType: 'adhoc' as const,
  ...overrides,
});

const createApiLead = (overrides: Partial<HuntingLead> = {}) => {
  const lead = createMockLead(overrides);
  return {
    ...lead,
    executionUuid: 'exec-uuid-1',
  };
};

const defaultProps = {
  onClose: jest.fn(),
  onSelectLead: jest.fn(),
};

describe('ThreatHuntingLeadsFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEntityAnalyticsRoutes.mockReturnValue({ fetchLeads: jest.fn() });
    mockUseQuery.mockReturnValue({
      data: { leads: [createApiLead()], total: 1 },
      isLoading: false,
    });
  });

  it('renders the flyout with title "Recent threat hunting leads"', () => {
    render(<ThreatHuntingLeadsFlyout {...defaultProps} />);

    expect(screen.getByTestId('threatHuntingLeadsFlyout')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Recent threat hunting leads' })
    ).toBeInTheDocument();
  });

  it('fetches leads with a perPage of 20 so the flyout is not artificially capped at 10', () => {
    const mockFetchLeads = jest.fn().mockResolvedValue({ leads: [], total: 0 });
    mockUseEntityAnalyticsRoutes.mockReturnValue({ fetchLeads: mockFetchLeads });
    let capturedQueryFn: ((ctx: { signal?: AbortSignal }) => unknown) | undefined;
    mockUseQuery.mockImplementation(
      (config: { queryFn?: (ctx: { signal?: AbortSignal }) => unknown }) => {
        capturedQueryFn = config.queryFn;
        return { data: { leads: [createApiLead()], total: 1 }, isLoading: false };
      }
    );

    render(<ThreatHuntingLeadsFlyout {...defaultProps} />);
    capturedQueryFn?.({ signal: undefined });

    expect(mockFetchLeads).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ perPage: 20 }),
      })
    );
  });

  it('renders a badge with the leads count beside the title', () => {
    mockUseQuery.mockReturnValue({
      data: { leads: [createApiLead(), createApiLead({ id: 'lead-2' })], total: 2 },
      isLoading: false,
    });

    render(<ThreatHuntingLeadsFlyout {...defaultProps} />);

    expect(screen.getByTestId('leadsCountBadge')).toHaveTextContent('2');
  });

  it('does not render the leads count badge while loading', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });

    render(<ThreatHuntingLeadsFlyout {...defaultProps} />);

    expect(screen.queryByTestId('leadsCountBadge')).not.toBeInTheDocument();
  });

  it('shows a no-matching-leads message when the search query matches nothing', () => {
    render(<ThreatHuntingLeadsFlyout {...defaultProps} />);

    fireEvent.change(screen.getByTestId('leadSearchField'), {
      target: { value: 'nonexistent-query' },
    });

    expect(screen.getByTestId('noMatchingLeads')).toHaveTextContent(
      'No hunting leads match your filter criteria'
    );
  });

  it('close button calls onClose', () => {
    const onClose = jest.fn();
    render(<ThreatHuntingLeadsFlyout {...defaultProps} onClose={onClose} />);

    const closeButton = screen.getByTestId('euiFlyoutCloseButton');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicking a lead item calls onSelectLead', () => {
    const onSelectLead = jest.fn();
    mockUseQuery.mockReturnValue({
      data: { leads: [createApiLead({ id: 'lead-42', title: 'Clicked Lead' })], total: 1 },
      isLoading: false,
    });

    render(<ThreatHuntingLeadsFlyout {...defaultProps} onSelectLead={onSelectLead} />);

    fireEvent.click(screen.getByTestId('leadListItem-lead-42'));

    expect(onSelectLead).toHaveBeenCalledTimes(1);
    expect(onSelectLead).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'lead-42', title: 'Clicked Lead' })
    );
  });

  it('clicking an entity badge in a list item opens the entity flyout and does not trigger onSelectLead', () => {
    const onSelectLead = jest.fn();
    mockUseQuery.mockReturnValue({
      data: {
        leads: [
          createApiLead({
            id: 'lead-badge',
            byline: 'User jsmith on host server-01',
            entities: [{ type: 'user', name: 'jsmith' }],
          }),
        ],
        total: 1,
      },
      isLoading: false,
    });

    render(<ThreatHuntingLeadsFlyout {...defaultProps} onSelectLead={onSelectLead} />);

    fireEvent.click(screen.getByTestId('leadEntityBadge-jsmith'));

    expect(mockOpenFlyout).toHaveBeenCalledTimes(1);
    expect(mockOpenFlyout).toHaveBeenCalledWith({
      right: {
        id: 'user-panel',
        params: {
          userName: 'jsmith',
          // No real entity id on this lead, so it falls back to `type:name`.
          entityId: 'user:jsmith',
          contextID: 'entity-analytics-threat-hunting-leads',
          scopeId: 'entity-analytics-threat-hunting-leads',
        },
      },
    });
    expect(onSelectLead).not.toHaveBeenCalled();
  });

  it('opens the entity flyout using the real entity id (EUID) when the lead entity carries one', () => {
    const onSelectLead = jest.fn();
    mockUseQuery.mockReturnValue({
      data: {
        leads: [
          createApiLead({
            id: 'lead-euid',
            byline: 'Host 8c67cb16-b7f2-4052-82f9-6edb87bb63ef triggered an alert',
            entities: [
              {
                type: 'host',
                name: '8c67cb16-b7f2-4052-82f9-6edb87bb63ef',
                id: 'host:8c67cb16-b7f2-4052-82f9-6edb87bb63ef',
              },
            ],
          }),
        ],
        total: 1,
      },
      isLoading: false,
    });

    render(<ThreatHuntingLeadsFlyout {...defaultProps} onSelectLead={onSelectLead} />);

    fireEvent.click(screen.getByTestId('leadEntityBadge-8c67cb16-b7f2-4052-82f9-6edb87bb63ef'));

    expect(mockOpenFlyout).toHaveBeenCalledTimes(1);
    expect(mockOpenFlyout).toHaveBeenCalledWith({
      right: {
        id: 'host-panel',
        params: {
          hostName: '8c67cb16-b7f2-4052-82f9-6edb87bb63ef',
          entityId: 'host:8c67cb16-b7f2-4052-82f9-6edb87bb63ef',
          contextID: 'entity-analytics-threat-hunting-leads',
          scopeId: 'entity-analytics-threat-hunting-leads',
        },
      },
    });
    expect(onSelectLead).not.toHaveBeenCalled();
  });

  it('renders lead byline in list items', () => {
    mockUseQuery.mockReturnValue({
      data: {
        leads: [createApiLead({ id: 'lead-byline', byline: 'Host server-01 with risk score 80' })],
        total: 1,
      },
      isLoading: false,
    });

    render(<ThreatHuntingLeadsFlyout {...defaultProps} />);

    expect(screen.getByText('Host server-01 with risk score 80')).toBeInTheDocument();
  });

  it('does not render tag badges in list items', () => {
    mockUseQuery.mockReturnValue({
      data: {
        leads: [createApiLead({ id: 'lead-tags', tags: ['malware', 'lateral-movement'] })],
        total: 1,
      },
      isLoading: false,
    });

    render(<ThreatHuntingLeadsFlyout {...defaultProps} />);

    expect(screen.queryByText('malware')).not.toBeInTheDocument();
    expect(screen.queryByText('lateral-movement')).not.toBeInTheDocument();
  });

  it('does not render timestamps on lead list items', () => {
    mockUseQuery.mockReturnValue({
      data: {
        leads: [createApiLead({ id: 'lead-no-time' })],
        total: 1,
      },
      isLoading: false,
    });

    const { container } = render(<ThreatHuntingLeadsFlyout {...defaultProps} />);

    expect(container.textContent).not.toContain('just now');
    expect(container.textContent).not.toContain('ago');
  });

  it('renders a skeleton while leads are loading', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });

    render(<ThreatHuntingLeadsFlyout {...defaultProps} />);

    expect(screen.getByTestId('leadsFlyoutLoadingSkeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('leadListItem-lead-1')).not.toBeInTheDocument();
  });

  it('displays the generation timestamp when lastRunTimestamp is provided', () => {
    render(
      <ThreatHuntingLeadsFlyout {...defaultProps} lastRunTimestamp="2026-03-13T14:30:00.000Z" />
    );

    expect(screen.getByTestId('leadsFlyoutGeneratedTimestamp')).toBeInTheDocument();
  });

  it('does not display the generation timestamp when lastRunTimestamp is absent', () => {
    render(<ThreatHuntingLeadsFlyout {...defaultProps} />);

    expect(screen.queryByTestId('leadsFlyoutGeneratedTimestamp')).not.toBeInTheDocument();
  });

  it('opens the leads archive index in Discover when the link is clicked', async () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation();

    render(<ThreatHuntingLeadsFlyout {...defaultProps} />);

    fireEvent.click(screen.getByTestId('viewLeadsArchiveIndexButton'));

    expect(mockLocatorsGet).toHaveBeenCalledWith('DISCOVER_APP_LOCATOR');
    await waitFor(() => expect(mockGetRedirectUrl).toHaveBeenCalled());
    expect(mockGetRedirectUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        dataViewSpec: expect.objectContaining({
          id: 'entity-analytics-threat-hunting-leads-archive-default',
          title:
            '.entity_analytics.entity-leads-adhoc.entity-default,.entity_analytics.entity-leads-scheduled.entity-default',
          allowHidden: true,
        }),
      })
    );
    await waitFor(() =>
      expect(openSpy).toHaveBeenCalledWith(
        'https://kibana.test/app/discover#/',
        '_blank',
        'noopener,noreferrer'
      )
    );

    openSpy.mockRestore();
  });

  it('disables the leads archive index link while the space id has not resolved yet', () => {
    const mockUseSpaceId = jest.requireMock('../../../../common/hooks/use_space_id')
      .useSpaceId as jest.Mock;
    mockUseSpaceId.mockReturnValueOnce(undefined);

    render(<ThreatHuntingLeadsFlyout {...defaultProps} />);

    expect(screen.getByTestId('viewLeadsArchiveIndexButton')).toBeDisabled();
  });
});
