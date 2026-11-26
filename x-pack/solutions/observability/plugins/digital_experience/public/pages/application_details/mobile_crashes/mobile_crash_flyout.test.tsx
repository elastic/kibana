/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { SessionTimelineEvent } from '../../../../common/sessions';
import type {
  MobileCrash,
  MobileCrashGroup,
  MobileCrashGroupDetailResponse,
} from '../../../../common/types/mobile';
import { useDiscoverHref } from '../../../hooks/use_discover_href';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { createUiSettingsMock } from '../../../test_utils/ui_settings_mock';
import { MobileCrashFlyout } from './mobile_crash_flyout';
import { useMobileCrashGroup, type MobileCrashGroupState } from './use_mobile_crash_group';

jest.mock('../../../hooks/use_kibana_services');
jest.mock('../../../hooks/use_discover_href');
jest.mock('./use_mobile_crash_group');

const CRASH_TIME = '2021-01-18T12:30:00.000Z';

const GROUP: MobileCrashGroup = {
  fingerprint: 'npe',
  type: 'java.lang.NullPointerException',
  message: 'TrackRecorder is null',
  users: 184,
  events: 201,
  sessions: 190,
  firstSeen: { time: '2021-01-18T06:00:00.000Z', release: '4.2.0' },
  lastSeen: { time: CRASH_TIME, release: '4.2.0' },
  newInRelease: '4.2.0',
};

const event = (fields: Partial<SessionTimelineEvent>): SessionTimelineEvent => ({
  kind: 'tap',
  name: 'Locate me',
  timestamp: '2021-01-18T12:29:50.000Z',
  offsetMs: 0,
  page: 'Map',
  detail: null,
  clickCount: null,
  stacktrace: null,
  traceId: null,
  spanId: null,
  statusCode: null,
  durationMs: null,
  ...fields,
});

const LATEST_CRASH: MobileCrash = {
  time: CRASH_TIME,
  // EDOT iOS sends a crash on the next launch, long after it happened.
  reportedAt: '2021-01-18T14:30:00.000Z',
  type: 'java.lang.NullPointerException',
  message: 'TrackRecorder is null',
  stacktrace:
    'java.lang.NullPointerException: TrackRecorder is null\n\tat com.example.MainActivity.onResume(MainActivity.kt:88)',
  release: '4.2.0',
  sessionId: '7f4b0c7e',
};

const DETAIL: MobileCrashGroupDetailResponse = {
  latestCrash: LATEST_CRASH,
  releases: { top: [{ key: '4.2.0', count: 201 }], other: 0 },
  osVersions: {
    top: [
      { key: '15', count: 100 },
      { key: '14', count: 51 },
    ],
    other: 50,
  },
  deviceModels: { top: [{ key: 'Pixel 8', count: 201 }], other: 0 },
  beforeCrash: [
    event({
      kind: 'request',
      name: 'POST',
      timestamp: '2021-01-18T12:29:40.000Z',
      detail: 'https://api.example.com/tracks?id=1',
      statusCode: 503,
      durationMs: 420,
    }),
    event({}),
  ],
  isPartial: false,
};

const mockDetail = (state: Partial<MobileCrashGroupState>) =>
  jest.mocked(useMobileCrashGroup).mockReturnValue({
    detail: DETAIL,
    isLoading: false,
    error: undefined,
    refresh: jest.fn(),
    ...state,
  });

/** `group: null` renders the flyout of a group the list lacks. */
const renderFlyout = ({
  group = GROUP,
  onClose = jest.fn(),
}: { group?: MobileCrashGroup | null; onClose?: () => void } = {}) =>
  render(
    <MobileCrashFlyout
      serviceName="trailmap-android"
      fingerprint="npe"
      group={group ?? undefined}
      onClose={onClose}
    />,
    {
      wrapper: ({ children }) => (
        <I18nProvider>
          <EuiProvider>{children}</EuiProvider>
        </I18nProvider>
      ),
    }
  );

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useKibanaServices).mockReturnValue({
    uiSettings: createUiSettingsMock(),
  } as unknown as ReturnType<typeof useKibanaServices>);
  jest.mocked(useDiscoverHref).mockReturnValue('/app/discover#/session');
  mockDetail({});
});

describe('MobileCrashFlyout', () => {
  it("shows the group's type, new badge, message and counts", () => {
    renderFlyout();

    const flyout = screen.getByTestId('digitalExperienceMobileCrashFlyout');
    expect(within(flyout).getByRole('heading', { level: 2 })).toHaveTextContent(
      'java.lang.NullPointerException'
    );
    expect(flyout).toHaveTextContent('New in 4.2.0');
    expect(flyout).toHaveTextContent('184');
    expect(useMobileCrashGroup).toHaveBeenCalledWith('trailmap-android', 'npe');
  });

  it('shows the stack trace of the latest crash', () => {
    renderFlyout();

    expect(screen.getByTestId('digitalExperienceMobileCrashStacktrace')).toHaveTextContent(
      'MainActivity.onResume'
    );
  });

  it('breaks the crashes down by app version, OS version and device model, the rest as Other', () => {
    renderFlyout();

    const osVersions = screen.getByTestId('digitalExperienceMobileCrashBreakdown-osVersions');
    expect(osVersions).toHaveTextContent('OS version');
    expect(osVersions).toHaveTextContent('15');
    expect(osVersions).toHaveTextContent('Other');
    // Each bar names the value it measures, not only its share.
    expect(
      within(osVersions).getByRole('progressbar', { name: /^15: .+ of the crashes$/ })
    ).toBeInTheDocument();
    expect(
      within(osVersions).getByRole('progressbar', { name: /^Other: .+ of the crashes$/ })
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('digitalExperienceMobileCrashBreakdown-deviceModels')
    ).toHaveTextContent('Pixel 8');
  });

  it('lists the session before the crash, oldest first, ending with the crash', () => {
    renderFlyout();

    const rows = within(screen.getByTestId('digitalExperienceMobileCrashTimeline'))
      .getAllByRole('row')
      .slice(1);
    expect(rows).toHaveLength(3);
    // The request's URL without its query, and its failed status.
    expect(rows[0]).toHaveTextContent('Request');
    expect(rows[0]).toHaveTextContent('https://api.example.com/tracks');
    expect(rows[0]).not.toHaveTextContent('?id=1');
    expect(rows[0]).toHaveTextContent('503');
    expect(within(rows[0]).getAllByRole('cell')[0]).toHaveTextContent(/ before$/);
    expect(rows[1]).toHaveTextContent('Tap');
    expect(rows[1]).toHaveTextContent('Map');
    expect(rows[2]).toHaveTextContent('Crash');
    expect(rows[2]).toHaveTextContent('At the crash');
  });

  it("opens the crash's session in Discover", () => {
    renderFlyout();

    expect(screen.getByTestId('digitalExperienceMobileCrashOpenSession')).toHaveAttribute(
      'href',
      '/app/discover#/session'
    );
    const [esql, timeRange] = jest.mocked(useDiscoverHref).mock.calls.at(-1) ?? [];
    // The session as "Before the crash" matches it: the id as the crash has it, in either case.
    expect(esql).toContain('`attributes.session.id` IN ("7f4b0c7e", "7f4b0c7e", "7F4B0C7E")');
    expect(esql).toContain('`service.name` == "trailmap-android"');
    // From the longest a session lasts before the crash to just after it was sent, so the crash
    // is in it.
    expect(timeRange).toEqual({
      from: '2021-01-17T12:29:00.000Z',
      to: '2021-01-18T14:35:00.000Z',
    });
  });

  it('disables Open session without a session, and says no session was recorded', () => {
    mockDetail({
      detail: { ...DETAIL, latestCrash: { ...LATEST_CRASH, sessionId: null }, beforeCrash: [] },
    });
    renderFlyout();

    expect(screen.getByTestId('digitalExperienceMobileCrashOpenSession')).toBeDisabled();
    expect(screen.getByText('The SDK recorded no session for this crash')).toBeInTheDocument();
    expect(screen.queryByTestId('digitalExperienceMobileCrashTimeline')).toBeNull();
  });

  it('reads the type from the latest crash when the list lacks the group', () => {
    renderFlyout({ group: null });

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'java.lang.NullPointerException'
    );
    expect(screen.queryByText('New in 4.2.0')).toBeNull();
  });

  it("says the session may miss events when the user can't read every index", () => {
    mockDetail({ detail: { ...DETAIL, isPartial: true } });
    renderFlyout();

    expect(screen.getByTestId('digitalExperienceMobileCrashPartialAccess')).toBeInTheDocument();
  });

  it('names what is loading for screen readers', () => {
    mockDetail({ detail: undefined, isLoading: true });
    renderFlyout();

    expect(screen.getByRole('progressbar', { name: 'Loading crash details' })).toBeInTheDocument();
  });

  it('shows the error with a retry', () => {
    const refresh = jest.fn();
    mockDetail({ detail: undefined, error: new Error('boom'), refresh });
    renderFlyout();

    fireEvent.click(screen.getByTestId('digitalExperienceMobileCrashRetry'));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('closes', () => {
    const onClose = jest.fn();
    renderFlyout({ onClose });

    fireEvent.click(screen.getByTestId('euiFlyoutCloseButton'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
