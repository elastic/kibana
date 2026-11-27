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
  EuiCodeBlock,
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
import { KbnInfoCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { SESSIONS_MAX_SESSION_MS } from '../../../../common/sessions';
import type { MobileCrash, MobileCrashGroup } from '../../../../common/types/mobile';
import { LoadErrorPrompt } from '../../../components/load_error_prompt';
import {
  DIGITAL_EXPERIENCE_EBT_ACTIONS,
  MOBILE_CRASHES_EBT_ELEMENTS,
} from '../../../ebt_constants';
import { useDiscoverHref } from '../../../hooks/use_discover_href';
import { useFormatters } from '../../../hooks/use_formatters';
import {
  EVENTS_LABEL,
  LAST_SEEN_LABEL,
  UNKNOWN_ERROR_TYPE_LABEL,
  USERS_LABEL,
  newInReleaseLabel,
} from '../../../labels';
import { mobileSessionDiscoverEsql } from '../../../../common/mobile/discover';
import { sessionTimeRange } from '../../session_detail/utils/session_discover';
import { CrashBreakdowns } from './crash_breakdowns';
import { CrashTimeline } from './crash_timeline';
import { useMobileCrashGroup } from './use_mobile_crash_group';

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

const CRASH_DETAILS_TITLE = i18n.translate(
  'xpack.digitalExperience.mobile.crashes.flyout.crashDetailsTitle',
  { defaultMessage: 'Crash details' }
);

const RELEASE_LABEL = i18n.translate('xpack.digitalExperience.mobile.crashes.flyout.release', {
  defaultMessage: 'App version',
});

const OS_VERSION_LABEL = i18n.translate('xpack.digitalExperience.mobile.crashes.flyout.osVersion', {
  defaultMessage: 'OS version',
});

const DEVICE_LABEL = i18n.translate('xpack.digitalExperience.mobile.crashes.flyout.device', {
  defaultMessage: 'Device',
});

const STACKTRACE_TITLE = i18n.translate(
  'xpack.digitalExperience.mobile.crashes.flyout.stacktrace',
  { defaultMessage: 'Stack trace of the latest crash' }
);

const BREAKDOWNS_TITLE = i18n.translate(
  'xpack.digitalExperience.mobile.crashes.flyout.breakdowns',
  { defaultMessage: 'Crashes by app version, OS and device' }
);

const BEFORE_CRASH_TITLE = i18n.translate(
  'xpack.digitalExperience.mobile.crashes.flyout.beforeCrash',
  { defaultMessage: 'Before the crash' }
);

const BEFORE_CRASH_SUBTITLE = i18n.translate(
  'xpack.digitalExperience.mobile.crashes.flyout.beforeCrashSubtitle',
  {
    defaultMessage:
      "The latest crash's session: its last requests, screens, taps, warning and error logs, and handled errors before the crash.",
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

// EUI announces it as "Loading crash details".
const DETAILS_LABEL = i18n.translate('xpack.digitalExperience.mobile.crashes.flyout.details', {
  defaultMessage: 'crash details',
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
    () => (sessionId ? mobileSessionDiscoverEsql({ serviceName, sessionId }) : undefined),
    [serviceName, sessionId]
  );
  const timeRange = useMemo(
    () =>
      sessionTimeRange({
        startTime: new Date(Date.parse(time) - SESSIONS_MAX_SESSION_MS).toISOString(),
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

/** Where the latest crash happened: its release, OS version and device, those it has. */
function LatestCrashContext({ release, osVersion, deviceModel }: MobileCrash) {
  const items = [
    { title: RELEASE_LABEL, value: release },
    { title: OS_VERSION_LABEL, value: osVersion },
    { title: DEVICE_LABEL, value: deviceModel },
  ].flatMap(({ title, value }) => (value ? [{ title, description: value }] : []));
  if (items.length === 0) {
    return null;
  }
  return (
    <>
      <EuiDescriptionList
        type="inline"
        compressed
        listItems={items}
        data-test-subj="digitalExperienceMobileCrashContext"
      />
      <EuiSpacer size="s" />
    </>
  );
}

/**
 * The latest crash's stack trace, or its message under a note when it has none. The header shows
 * the type and message already, and a JVM stack trace starts with them.
 */
function CrashStacktrace({ message, stacktrace }: MobileCrash) {
  if (!stacktrace) {
    return (
      <KbnInfoCallout size="s" title={NO_STACKTRACE_TITLE}>
        {message}
      </KbnInfoCallout>
    );
  }
  // The code block alone: `PlaintextStacktrace` would add an empty heading without its title.
  return (
    <EuiCodeBlock isCopyable data-test-subj="digitalExperienceMobileCrashStacktrace">
      {stacktrace}
    </EuiCodeBlock>
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
  // A neutral title until there is a crash to name, so a link to a missing group doesn't look like
  // a crash without a type.
  const title =
    group || latestCrash
      ? (group?.type ?? latestCrash?.type ?? UNKNOWN_ERROR_TYPE_LABEL)
      : CRASH_DETAILS_TITLE;
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
      return <EuiSkeletonText lines={8} isLoading contentAriaLabel={DETAILS_LABEL} />;
    }
    // Before the empty state too: a crash the user can't read looks like no crash.
    const partialAccess = detail.isPartial && (
      <>
        <KbnWarningCallout
          data-test-subj="digitalExperienceMobileCrashPartialAccess"
          size="s"
          title={PARTIAL_ACCESS_TITLE}
        />
        <EuiSpacer size="m" />
      </>
    );
    if (!latestCrash) {
      return (
        <>
          {partialAccess}
          <KbnInfoCallout size="s" title={NO_CRASH_TITLE} />
        </>
      );
    }
    return (
      <>
        {partialAccess}
        <OpenSessionButton serviceName={serviceName} crash={latestCrash} />
        <EuiSpacer size="l" />
        <SectionTitle title={STACKTRACE_TITLE} />
        <EuiSpacer size="s" />
        <LatestCrashContext {...latestCrash} />
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
      size="l"
      aria-labelledby={titleId}
      data-test-subj="digitalExperienceMobileCrashFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
          <EuiFlexItem grow={false} css={{ minWidth: 0, wordBreak: 'break-word' }}>
            <EuiTitle size="s">
              <h2 id={titleId}>{title}</h2>
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
