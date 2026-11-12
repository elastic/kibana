/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  euiPaletteColorBlind,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getEbtProps } from '@kbn/ebt-click';
import type { SessionRequest, SessionRequestPhases } from '../../../../common/sessions';
import { DIGITAL_EXPERIENCE_EBT_ACTIONS, SESSIONS_EBT_ELEMENTS } from '../../../ebt_constants';
import { formatBytes } from '../../../utils/format_bytes';
import { formatElapsed } from '../utils/visit_activity';

const PHASES: ReadonlyArray<{ id: keyof SessionRequestPhases; label: string }> = [
  {
    id: 'queued',
    label: i18n.translate('xpack.digitalExperience.sessionDetail.request.queuedPhase', {
      defaultMessage: 'Queued',
    }),
  },
  {
    id: 'dns',
    label: i18n.translate('xpack.digitalExperience.sessionDetail.request.dnsPhase', {
      defaultMessage: 'DNS lookup',
    }),
  },
  {
    id: 'connect',
    label: i18n.translate('xpack.digitalExperience.sessionDetail.request.connectPhase', {
      defaultMessage: 'Connection',
    }),
  },
  {
    id: 'tls',
    label: i18n.translate('xpack.digitalExperience.sessionDetail.request.tlsPhase', {
      defaultMessage: 'TLS (part of the connection)',
    }),
  },
  {
    id: 'waiting',
    label: i18n.translate('xpack.digitalExperience.sessionDetail.request.waitingPhase', {
      defaultMessage: 'Waiting for the server',
    }),
  },
  {
    id: 'download',
    label: i18n.translate('xpack.digitalExperience.sessionDetail.request.downloadPhase', {
      defaultMessage: 'Download',
    }),
  },
];

const RESTRICTED_NOTE = i18n.translate(
  'xpack.digitalExperience.sessionDetail.request.restrictedNote',
  {
    defaultMessage:
      'The browser only reports when this cross-origin request started and ended: its server does not send the Timing-Allow-Origin header, so the phases and sizes are unknown.',
  }
);

const CACHED_NOTE = i18n.translate('xpack.digitalExperience.sessionDetail.request.cachedNote', {
  defaultMessage: 'Served from the browser cache, without going over the network.',
});

const NOT_TIMED_NOTE = i18n.translate(
  'xpack.digitalExperience.sessionDetail.request.notTimedNote',
  {
    defaultMessage:
      'This request has no resource timing, for example because it failed before a response, so only its duration is known.',
  }
);

const VIEW_TRACE_LABEL = i18n.translate(
  'xpack.digitalExperience.sessionDetail.request.viewTraceLabel',
  { defaultMessage: 'View trace' }
);

const YES = i18n.translate('xpack.digitalExperience.sessionDetail.request.yes', {
  defaultMessage: 'Yes',
});

/** A bar of the request's phases, each as wide as its share of the duration. */
function PhaseBar({ phases }: { phases: SessionRequestPhases }) {
  const { euiTheme } = useEuiTheme();
  const palette = euiPaletteColorBlind();
  // TLS is part of the connection, so the bar shows the connection without it next to it.
  const segments = PHASES.map(({ id, label }, index) => ({
    id,
    label,
    color: palette[index % palette.length],
    value: id === 'connect' ? Math.max(0, phases.connect - phases.tls) : phases[id],
  })).filter(({ value }) => value > 0);
  const total = segments.reduce((sum, { value }) => sum + value, 0);
  if (total === 0) {
    return null;
  }
  return (
    <>
      <div
        css={css({
          display: 'flex',
          height: euiTheme.size.s,
          borderRadius: euiTheme.border.radius.small,
          overflow: 'hidden',
        })}
        role="img"
        aria-label={segments
          .map(({ label, value }) => `${label} ${formatElapsed(value)}`)
          .join(', ')}
      >
        {segments.map(({ id, color, value }) => (
          <span key={id} style={{ width: `${(value / total) * 100}%`, background: color }} />
        ))}
      </div>
      <EuiSpacer size="xs" />
      <EuiFlexGroup gutterSize="m" wrap responsive={false}>
        {segments.map(({ id, label, color, value }) => (
          <EuiFlexItem key={id} grow={false}>
            <EuiText size="xs" color="subdued">
              <span
                aria-hidden={true}
                css={css({
                  display: 'inline-block',
                  width: euiTheme.size.s,
                  height: euiTheme.size.s,
                  borderRadius: euiTheme.border.radius.small,
                  marginRight: euiTheme.size.xs,
                })}
                style={{ background: color }}
              />
              {`${label} ${formatElapsed(value)}`}
            </EuiText>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </>
  );
}

/** What is known about one request: its URL, outcome, phases and sizes, and its trace. */
export function RequestDetails({
  request,
  offsetMs,
  typeLabel,
  traceHref,
}: {
  request: SessionRequest;
  offsetMs: number;
  typeLabel: string;
  traceHref: string | undefined;
}) {
  const { euiTheme } = useEuiTheme();
  const note = request.cached
    ? CACHED_NOTE
    : request.timingWithheld
    ? RESTRICTED_NOTE
    : request.phases === null
    ? NOT_TIMED_NOTE
    : null;

  const items = [
    {
      title: i18n.translate('xpack.digitalExperience.sessionDetail.request.typeLabel', {
        defaultMessage: 'Type',
      }),
      description: `${typeLabel} (${request.initiatorType})`,
    },
    ...(request.method || request.statusCode !== null
      ? [
          {
            title: i18n.translate('xpack.digitalExperience.sessionDetail.request.responseLabel', {
              defaultMessage: 'Response',
            }),
            description: [
              request.method,
              request.statusCode ??
                (request.failed
                  ? i18n.translate('xpack.digitalExperience.sessionDetail.request.noResponse', {
                      defaultMessage: 'no response',
                    })
                  : null),
            ]
              .filter((part) => part !== null)
              .join(' '),
          },
        ]
      : []),
    {
      title: i18n.translate('xpack.digitalExperience.sessionDetail.request.timingLabel', {
        defaultMessage: 'Started at, took',
      }),
      description: `${formatElapsed(offsetMs)}, ${formatElapsed(request.durationMs)}`,
    },
    ...(request.transferSize !== null
      ? [
          {
            title: i18n.translate('xpack.digitalExperience.sessionDetail.request.sizeLabel', {
              defaultMessage: 'Transferred (decoded)',
            }),
            description: `${formatBytes(request.transferSize)} (${formatBytes(
              request.decodedBodySize ?? 0
            )})`,
          },
        ]
      : []),
    ...(request.protocol
      ? [
          {
            title: i18n.translate('xpack.digitalExperience.sessionDetail.request.protocolLabel', {
              defaultMessage: 'Protocol',
            }),
            description: request.protocol,
          },
        ]
      : []),
    ...(request.renderBlocking
      ? [
          {
            title: i18n.translate(
              'xpack.digitalExperience.sessionDetail.request.renderBlockingLabel',
              { defaultMessage: 'Render-blocking' }
            ),
            description: YES,
          },
        ]
      : []),
  ];

  return (
    <div
      data-test-subj="digitalExperienceRequestDetails"
      css={css({
        padding: euiTheme.size.s,
        borderLeft: euiTheme.border.thick,
        background: euiTheme.colors.backgroundBaseSubdued,
      })}
    >
      <EuiCodeBlock fontSize="s" paddingSize="s" transparentBackground isCopyable>
        {request.url}
      </EuiCodeBlock>
      <EuiDescriptionList type="column" compressed listItems={items} />
      {request.phases && (
        <>
          <EuiSpacer size="s" />
          <PhaseBar phases={request.phases} />
        </>
      )}
      {note && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            {note}
          </EuiText>
        </>
      )}
      {traceHref && (
        <>
          <EuiSpacer size="s" />
          <EuiButtonEmpty
            size="xs"
            iconType="chartWaterfall"
            href={traceHref}
            flush="left"
            data-test-subj="digitalExperienceRequestTraceLink"
            {...getEbtProps({
              action: DIGITAL_EXPERIENCE_EBT_ACTIONS.VIEW_TRACE,
              element: SESSIONS_EBT_ELEMENTS.TRACE_LINK,
            })}
          >
            {VIEW_TRACE_LABEL}
          </EuiButtonEmpty>
        </>
      )}
    </div>
  );
}

/** The stack trace of an error, or why there is none. */
export function ErrorDetails({ stacktrace }: { stacktrace: string | null }) {
  return stacktrace ? (
    <EuiCodeBlock
      data-test-subj="digitalExperienceErrorStacktrace"
      fontSize="s"
      paddingSize="s"
      overflowHeight={240}
      isCopyable
    >
      {stacktrace}
    </EuiCodeBlock>
  ) : (
    <EuiText size="xs" color="subdued" data-test-subj="digitalExperienceErrorNoStacktrace">
      {i18n.translate('xpack.digitalExperience.sessionDetail.error.noStacktrace', {
        defaultMessage:
          'The browser reported no stack trace for this error, as for a rejected promise with a plain value.',
      })}
    </EuiText>
  );
}
