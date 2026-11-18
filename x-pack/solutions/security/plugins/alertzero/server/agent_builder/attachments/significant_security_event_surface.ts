/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SurfaceComposition } from '@kbn/agent-builder-server/attachments';
import { i18n } from '@kbn/i18n';
import type { ComponentsNode } from '@kbn/isomer-components';
import type { SignificantSecurityEventAttachmentData } from '../../../common/significant_security_event_schema';
import { SSE_BASIS_LABELS, toSseViewModel, type SseDetection } from '../../../common/sse_view';

type HuntResult = NonNullable<SignificantSecurityEventAttachmentData['hunt_result']>;

const MAX_EVIDENCE_ITEMS = 5;

const SEVERITY_LABELS: Record<SignificantSecurityEventAttachmentData['severity'], string> = {
  low: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.surface.severityLow', {
    defaultMessage: 'Low severity',
  }),
  medium: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.surface.severityMedium', {
    defaultMessage: 'Medium severity',
  }),
  high: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.surface.severityHigh', {
    defaultMessage: 'High severity',
  }),
  critical: i18n.translate(
    'xpack.alertzero.agentBuilder.attachments.sse.surface.severityCritical',
    { defaultMessage: 'Critical severity' }
  ),
};

const STATUS_LABELS: Record<SignificantSecurityEventAttachmentData['status'], string> = {
  open: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.surface.statusOpen', {
    defaultMessage: 'Open',
  }),
  investigating: i18n.translate(
    'xpack.alertzero.agentBuilder.attachments.sse.surface.statusInvestigating',
    { defaultMessage: 'Investigating' }
  ),
  resolved: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.surface.statusResolved', {
    defaultMessage: 'Resolved',
  }),
  false_positive: i18n.translate(
    'xpack.alertzero.agentBuilder.attachments.sse.surface.statusFalsePositive',
    { defaultMessage: 'False positive' }
  ),
};

const HIT_SOURCE_LABELS: Record<HuntResult['hit_sources'][number], string> = {
  tier1: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.surface.iocHunt', {
    defaultMessage: 'IOC Hunt',
  }),
  tier2: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.surface.behaviorHunt', {
    defaultMessage: 'Behavior Hunt',
  }),
};

const oneLine = (value: string): string => value.replace(/\s+/g, ' ').trim();

const toWhatMatched = ({
  kind,
  id,
  field,
  matched_on: matchedOn,
  technique_id: techniqueId,
  technique_name: techniqueName,
}: SseDetection): string => {
  if (kind === 'behavior') {
    return [techniqueId, techniqueName].filter(Boolean).join(' ') || id;
  }

  const value = matchedOn[0]?.value ?? id;

  return field ? `${value} (${field})` : value;
};

const toScope = ({
  total,
  host_count: hostCount,
  user_count: userCount,
  hosts_truncated: hostsTruncated,
  users_truncated: usersTruncated,
}: SseDetection): string =>
  [
    i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.surface.eventCount', {
      defaultMessage: '{count, plural, one {# event} other {# events}}',
      values: { count: total },
    }),
    hostCount !== undefined &&
      (hostsTruncated
        ? i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.surface.atLeastHosts', {
            defaultMessage: '{count}+ hosts',
            values: { count: hostCount },
          })
        : i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.surface.hostCount', {
            defaultMessage: '{count, plural, one {# host} other {# hosts}}',
            values: { count: hostCount },
          })),
    userCount !== undefined &&
      (usersTruncated
        ? i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.surface.atLeastUsers', {
            defaultMessage: '{count}+ users',
            values: { count: userCount },
          })
        : i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.surface.userCount', {
            defaultMessage: '{count, plural, one {# user} other {# users}}',
            values: { count: userCount },
          })),
  ]
    .filter((part): part is string => Boolean(part))
    .join(', ');

const toSeen = ({ first_seen: firstSeen, last_seen: lastSeen }: SseDetection): string | null => {
  const seen = [...new Set([firstSeen, lastSeen].filter(Boolean))];

  return seen.length > 0 ? seen.join(' – ') : null;
};

/** One row per detection: what matched, how strong a basis it is, how far it reached, and when. */
const toDetectionsTable = (detections: SseDetection[]): ComponentsNode[] =>
  detections.length > 0
    ? [
        {
          type: 'table',
          columns: [
            i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.surface.whatMatched', {
              defaultMessage: 'What matched',
            }),
            i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.surface.basis', {
              defaultMessage: 'Basis',
            }),
            i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.surface.scope', {
              defaultMessage: 'Scope',
            }),
            i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.surface.seen', {
              defaultMessage: 'Seen',
            }),
          ].map((label) => ({ label })),
          rows: detections.map((detection) => [
            toWhatMatched(detection),
            SSE_BASIS_LABELS[detection.basis],
            toScope(detection),
            toSeen(detection),
          ]),
        },
      ]
    : [];

/** Which hunt confirmed the finding, and the IOC Hunt's reach. */
const toHuntResultFields = (huntResult?: HuntResult): ComponentsNode[] => {
  if (!huntResult) {
    return [];
  }

  const {
    hit_sources: hitSources,
    tier1: { counts },
  } = huntResult;

  return [
    {
      type: 'fields',
      items: [
        {
          label: i18n.translate(
            'xpack.alertzero.agentBuilder.attachments.sse.surface.confirmedBy',
            {
              defaultMessage: 'Confirmed by',
            }
          ),
          value:
            hitSources.length > 0
              ? hitSources.map((source) => HIT_SOURCE_LABELS[source]).join(', ')
              : i18n.translate(
                  'xpack.alertzero.agentBuilder.attachments.sse.surface.noConfirmedHit',
                  { defaultMessage: 'No confirmed hit' }
                ),
        },
        {
          label: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.surface.iocHits', {
            defaultMessage: 'IOC Hunt hits',
          }),
          value: String(counts.total_hits),
        },
        {
          label: i18n.translate(
            'xpack.alertzero.agentBuilder.attachments.sse.surface.affectedHosts',
            { defaultMessage: 'Affected hosts' }
          ),
          value: String(counts.affected_hosts),
        },
        {
          label: i18n.translate(
            'xpack.alertzero.agentBuilder.attachments.sse.surface.affectedUsers',
            { defaultMessage: 'Affected users' }
          ),
          value: String(counts.affected_users),
        },
      ],
    },
  ];
};

const toEvidenceList = (heading: string, items: string[]): ComponentsNode[] => {
  if (items.length === 0) {
    return [];
  }

  const hidden = items.length - MAX_EVIDENCE_ITEMS;

  const lines = [
    `**${heading}**`,
    ...items.slice(0, MAX_EVIDENCE_ITEMS).map((item) => `- ${oneLine(item)}`),
    ...(hidden > 0
      ? [
          `- ${i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.surface.more', {
            defaultMessage: '+{count} more',
            values: { count: hidden },
          })}`,
        ]
      : []),
  ];

  return [{ type: 'markdown', text: lines.join('\n') }];
};

/** The evidence for and against, collapsed in Slack, or nothing when none was recorded. */
const toEvidenceSection = ({
  evidence_for: evidenceFor,
  evidence_against: evidenceAgainst,
}: SignificantSecurityEventAttachmentData): ComponentsNode[] => {
  const body = [
    ...toEvidenceList(
      i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.surface.evidenceFor', {
        defaultMessage: 'Evidence for',
      }),
      evidenceFor
    ),
    ...toEvidenceList(
      i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.surface.evidenceAgainst', {
        defaultMessage: 'Evidence against',
      }),
      evidenceAgainst
    ),
  ];

  return body.length > 0
    ? [
        {
          type: 'section',
          title: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.surface.evidence', {
            defaultMessage: 'Evidence',
          }),
          collapsible: true,
          body,
        },
      ]
    : [];
};

/**
 * The event as the Kibana card leads with it: its classification, summary and hypothesis, what
 * matched, the hunt's reach and the evidence. Cited events, alerts and Discover pivots stay in
 * Kibana.
 */
export const toSignificantSecurityEventSurfaceComposition = (
  data: SignificantSecurityEventAttachmentData
): SurfaceComposition => {
  const { summary, basis, detections } = toSseViewModel(data);
  const hypothesis: ComponentsNode = { type: 'markdown', text: data.hypothesis_tested };

  return {
    type: 'view',
    title: data.title,
    subtitle: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.surface.fromReport', {
      defaultMessage: 'From {reportId}',
      values: { reportId: data.report_id },
    }),
    body: [
      {
        type: 'context',
        items: [
          SEVERITY_LABELS[data.severity],
          i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.surface.confidence', {
            defaultMessage: '{percent}% confidence',
            values: { percent: Math.round(data.confidence * 100) },
          }),
          STATUS_LABELS[data.status],
          ...(basis ? [SSE_BASIS_LABELS[basis]] : []),
        ].map((text) => ({ text })),
      },
      ...(summary !== data.title ? [{ type: 'markdown' as const, text: summary }] : []),
      {
        type: 'section',
        title: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.surface.hypothesis', {
          defaultMessage: 'Hypothesis',
        }),
        body: [hypothesis],
      },
      ...toDetectionsTable(detections),
      ...toHuntResultFields(data.hunt_result),
      ...toEvidenceSection(data),
    ],
  };
};
