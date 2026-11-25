/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getEbtProps } from '@kbn/ebt-click';
import { PlaintextStacktrace } from '@kbn/event-stacktrace';
import { KbnInfoCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { SESSIONS_MAX_SESSION_HOURS } from '../../../../common/sessions';
import type { MobileCrash, MobileCrashGroup } from '../../../../common/types/mobile';
import { LoadErrorPrompt } from '../../../components/load_error_prompt';
import {
  DIGITAL_EXPERIENCE_EBT_ACTIONS,
  MOBILE_CRASHES_EBT_ELEMENTS,
} from '../../../ebt_constants';
import { useDiscoverHref } from '../../../hooks/use_discover_href';
import { useFormatters } from '../../../hooks/use_formatters';
import { LAST_SEEN_LABEL, UNKNOWN_ERROR_TYPE_LABEL } from '../../../labels';
import { sessionEsqlQuery, sessionTimeRange } from '../../session_detail/utils/session_discover';
import { CrashBreakdowns } from './crash_breakdowns';
import { CrashTimeline } from './crash_timeline';
import { useMobileCrashGroup } from './use_mobile_crash_group';

const MAX_SESSION_MS = SESSIONS_MAX_SESSION_HOURS * 60 * 60 * 1000;

const LOAD_ERROR_TITLE = i18n.translate('xpack.digitalExperience.mobile.crashes.flyout.loadError', {
  defaultMessage: 'Could not load the crash',
});

const NO_CRASH_TITLE = i18n.translate('xpack.digitalExperience.mobile.crashes.flyout.noCrash', {
  defaultMessage: 'This crash group has no crash in the selected time range and filters',
});

const PARTIAL_ACCESS_TITLE = i18n.translate(
  'xpack.digitalExperience.mobile.crashes.flyout.partialAccess',
  {
    defaultMessage:
      "You can't read all of the mobile logs and traces indices, so crashes and the session's requests and screens may be missing. Ask an administrator for read access to them.",
  }
);

const NO_STACKTRACE_TITLE = i18n.translate(
  'xpack.digitalExperience.mobile.crashes.flyout.noStacktrace',
  { defaultMessage: 'This crash has no stack trace' }
);

const STACKTRACE_TITLE = i18n.translate(
  'xpack.digitalExperience.mobile.crashes.flyout.stacktrace',
  { defaultMessage: 'Stack trace of the latest crash' }
);

const BREAKDOWNS_TITLE = i18n.translate(
  'xpack.digitalExperience.mobile.crashes.flyout.breakdowns',
  { defaultMessage: 'Who it affects' }
);

const BEFORE_CRASH_TITLE = i18n.translate(
  'xpack.digitalExperience.mobile.crashes.flyout.beforeCrash',
  { defaultMessage: 'Before the crash' }
);

const BEFORE_CRASH_SUBTITLE = i18n.translate(
  'xpack.digitalExperience.mobile.crashes.flyout.beforeCrashSubtitle',
  {
    defaultMessage:
      "The latest crash's session: its last requests, screens, taps, logs and errors before the crash.",
  }
);

const NO_SESSION_TITLE = i18n.translate('xpack.digitalExperience.mobile.crashes.flyout.noSession', {
  defaultMessage: 'The SDK recorded no session for this crash',
});

const NO_EVENTS_TITLE = i18n.translate('xpack.digitalExperience.mobile.crashes.flyout.noEvents', {
  defaultMessage: 'No events of this session before the crash',
});

const OPEN_SESSION_LABEL = i18n.translate(
  'xpack.digitalExperience.mobile.crashes.flyout.openSession',
  { defaultMessage: 'Open session in Discover' }
);

const OPEN_SESSION_NO_SESSION = i18n.translate(
  'xpack.digitalExperience.mobile.crashes.flyout.openSessionNoSession',
  { defaultMessage: 'The SDK recorded no session for this crash.' }
);

const OPEN_SESSION_NO_DISCOVER = i18n.translate(
  'xpack.digitalExperience.mobile.crashes.flyout.openSessionNoDiscover',
  { defaultMessage: 'Opening a session needs access to Discover.' }
);

const USERS_LABEL = i18n.translate('xpack.digitalExperience.mobile.crashes.flyout.users', {
  defaultMessage: 'Users',
});

const EVENTS_LABEL = i18n.translate('xpack.digitalExperience.mobile.crashes.flyout.events', {
  defaultMessage: 'Events',
});

const newInReleaseLabel = (release: string) =>
  i18n.translate('xpack.digitalExperience.mobile.crashes.flyout.newInRelease', {
    defaultMessage: 'New in {release}',
    values: { release },
  });

function SectionTitle({ title }: { title: string }) {
  return (
    <EuiTitle size="xs">
      <h3>{title}</h3>
    </EuiTitle>
  );
}

/**
 * The latest crash's session in Discover: its events from the longest a session lasts before the
 * crash up to when the crash was sent, so a crash EDOT iOS sent on the next launch is in it too.
 * The session page of #72 replaces it.
 */
function OpenSessionButton({ serviceName, crash }: { serviceName: string; crash: MobileCrash }) {
  const { sessionId, time, reportedAt } = crash;
  const esql = useMemo(
    () => (sessionId ? sessionEsqlQuery({ serviceName, sessionId }) : undefined),
    [serviceName, sessionId]
  );
  const timeRange = useMemo(
    () =>
      sessionTimeRange({
        startTime: new Date(Date.parse(time) - MAX_SESSION_MS).toISOString(),
        endTime: Date.parse(reportedAt) > Date.parse(time) ? reportedAt : time,
      }),
    [time, reportedAt]
  );
  const href = useDiscoverHref(esql, timeRange);
  const noHrefReason = href ? undefined : OPEN_SESSION_NO_DISCOVER;
  const disabledReason = sessionId ? noHrefReason : OPEN_SESSION_NO_SESSION;
  const button = (
    <EuiButton
      size="s"
      iconType="discoverApp"
      href={href}
      isDisabled={disabledReason !== undefined}
      data-test-subj="digitalExperienceMobileCrashOpenSession"
      {...getEbtProps({
        action: DIGITAL_EXPERIENCE_EBT_ACTIONS.OPEN_IN_DISCOVER,
        element: MOBILE_CRASHES_EBT_ELEMENTS.OPEN_SESSION,
      })}
    >
      {OPEN_SESSION_LABEL}
    </EuiButton>
  );
  return disabledReason ? <EuiToolTip content={disabledReason}>{button}</EuiToolTip> : button;
}

/** The latest crash's stack trace, or its message under a note when it has none. */
function CrashStacktrace({ type, message, stacktrace }: MobileCrash) {
  if (!stacktrace) {
    return (
      <KbnInfoCallout size="s" title={NO_STACKTRACE_TITLE}>
        {message}
      </KbnInfoCallout>
    );
  }
  // `PlaintextStacktrace` takes no `data-test-subj`.
  return (
    <div data-test-subj="digitalExperienceMobileCrashStacktrace">
      <PlaintextStacktrace
        type={type ?? undefined}
        message={message ?? undefined}
        stacktrace={stacktrace}
      />
    </div>
  );
}

/**
 * One crash group: its counts, the latest crash's stack trace, the crashes by app version, OS
 * version and device model, and what the latest crash's session did before it.
 */
export function MobileCrashFlyout({
  serviceName,
  fingerprint,
  group,
  onClose,
}: {
  serviceName: string;
  fingerprint: string;
  /** The group as the table lists it; missing when a link opens a group the list doesn't have. */
  group: MobileCrashGroup | undefined;
  onClose: () => void;
}) {
  const { formatNumber, formatDate } = useFormatters();
  const titleId = useGeneratedHtmlId({ prefix: 'digitalExperienceMobileCrashFlyoutTitle' });
  const { detail, error, refresh } = useMobileCrashGroup(serviceName, fingerprint);
  const latestCrash = detail?.latestCrash ?? null;
  const type = group?.type ?? latestCrash?.type ?? null;
  const counts = group
    ? [
        { title: USERS_LABEL, description: formatNumber(group.users) },
        { title: EVENTS_LABEL, description: formatNumber(group.events) },
        { title: LAST_SEEN_LABEL, description: formatDate(group.lastSeen.time) },
      ]
    : [];

  const renderBody = () => {
    if (error) {
      return (
        <LoadErrorPrompt
          data-test-subj="digitalExperienceMobileCrashError"
          retryDataTestSubj="digitalExperienceMobileCrashRetry"
          retryEbtElement={MOBILE_CRASHES_EBT_ELEMENTS.RETRY}
          title={LOAD_ERROR_TITLE}
          error={error}
          onRetry={refresh}
        />
      );
    }
    if (!detail) {
      return <EuiSkeletonText lines={8} isLoading contentAriaLabel={BEFORE_CRASH_TITLE} />;
    }
    if (!latestCrash) {
      return <KbnInfoCallout size="s" title={NO_CRASH_TITLE} />;
    }
    return (
      <>
        {detail.isPartial && (
          <>
            <KbnWarningCallout
              data-test-subj="digitalExperienceMobileCrashPartialAccess"
              size="s"
              title={PARTIAL_ACCESS_TITLE}
            />
            <EuiSpacer size="m" />
          </>
        )}
        <OpenSessionButton serviceName={serviceName} crash={latestCrash} />
        <EuiSpacer size="l" />
        <SectionTitle title={STACKTRACE_TITLE} />
        <EuiSpacer size="s" />
        <CrashStacktrace {...latestCrash} />
        <EuiSpacer size="l" />
        <SectionTitle title={BREAKDOWNS_TITLE} />
        <EuiSpacer size="s" />
        <CrashBreakdowns detail={detail} />
        <EuiSpacer size="l" />
        <SectionTitle title={BEFORE_CRASH_TITLE} />
        <EuiText size="xs" color="subdued">
          {BEFORE_CRASH_SUBTITLE}
        </EuiText>
        <EuiSpacer size="s" />
        {!latestCrash.sessionId ? (
          <KbnInfoCallout size="s" title={NO_SESSION_TITLE} />
        ) : detail.beforeCrash.length === 0 ? (
          <KbnInfoCallout size="s" title={NO_EVENTS_TITLE} />
        ) : (
          <CrashTimeline events={detail.beforeCrash} crash={latestCrash} />
        )}
      </>
    );
  };

  return (
    <EuiFlyout
      onClose={onClose}
      size="m"
      aria-labelledby={titleId}
      data-test-subj="digitalExperienceMobileCrashFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h2 id={titleId}>{type ?? UNKNOWN_ERROR_TYPE_LABEL}</h2>
            </EuiTitle>
          </EuiFlexItem>
          {group?.newInRelease && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="warning">{newInReleaseLabel(group.newInRelease)}</EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        {(group?.message ?? latestCrash?.message) && (
          <EuiText size="s" color="subdued">
            {group?.message ?? latestCrash?.message}
          </EuiText>
        )}
        {counts.length > 0 && (
          <>
            <EuiSpacer size="s" />
            <EuiDescriptionList type="inline" compressed listItems={counts} />
          </>
        )}
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{renderBody()}</EuiFlyoutBody>
    </EuiFlyout>
  );
}
