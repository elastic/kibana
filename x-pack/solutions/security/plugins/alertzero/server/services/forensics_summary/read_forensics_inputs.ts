/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common';
import { getLatestVersion } from '@kbn/agent-builder-common';
import type { ElasticsearchClient } from '@kbn/core/server';
import { z, lazySchema } from '@kbn/zod/v4';
import {
  ANALYZE_ENDPOINT_KI_TYPE,
  ATTACK_DISCOVERY_ATTACHMENT_ID,
  FORENSICS_AI_INDEX_ID,
  MAX_ALERTS,
  MAX_ALERT_IDS,
  getForensicsAttachmentIds,
} from './constants';
import type { IocKind } from './constants';
import type { ForensicsAlert, ForensicsSummaryInputs } from './types';
import { toPlainAttackTitle } from './view_model';

/** The finished Endpoint Analysis of an Investigation, from its indicator. */
export interface EndpointAnalysisIndicator {
  kiId: string;
  verdict?: string;
  autonomy?: string;
  analyzedAt?: string;
}

const indicatorSourceSchema = lazySchema(() =>
  z.object({
    id: z.string().optional(),
    updated_at: z.string().optional(),
    attributes: z
      .object({
        forensic_verdict: z.string().optional(),
        autonomy: z.string().optional(),
      })
      .optional(),
  })
);

/** The Investigation's processed Endpoint Analysis indicator, or undefined when none has finished. */
export const findEndpointAnalysisIndicator = async ({
  esClient,
  spaceId,
  conversationId,
  abortSignal,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  conversationId: string;
  abortSignal?: AbortSignal;
}): Promise<EndpointAnalysisIndicator | undefined> => {
  const response = await esClient.search(
    {
      index: `ai-index-idx-${FORENSICS_AI_INDEX_ID}`,
      ignore_unavailable: true,
      allow_no_indices: true,
      size: 1,
      sort: [{ updated_at: { order: 'desc', unmapped_type: 'date' } }],
      query: {
        bool: {
          filter: [
            { term: { type: ANALYZE_ENDPOINT_KI_TYPE } },
            { term: { 'attributes.space_id': spaceId } },
            { term: { 'attributes.investigation_id': conversationId } },
            { term: { 'attributes.status': 'processed' } },
          ],
        },
      },
    },
    { signal: abortSignal }
  );
  const [hit] = response.hits.hits;
  const parsed = indicatorSourceSchema.safeParse(hit?._source);
  const kiId = (parsed.success ? parsed.data.id : undefined) ?? hit?._id;
  if (!hit || !kiId) {
    return undefined;
  }
  const { updated_at: analyzedAt, attributes } = parsed.success ? parsed.data : {};
  return {
    kiId,
    verdict: attributes?.forensic_verdict || undefined,
    autonomy: attributes?.autonomy || undefined,
    analyzedAt,
  };
};

// The attachments are read leniently: a field the card doesn't show, or a malformed one, drops that part
// of the card instead of the whole of it.

const timelineSchema = lazySchema(() =>
  z.object({
    events: z
      .array(z.object({ timestamp: z.string(), host: z.string(), description: z.string() }))
      .catch([]),
    window: z.object({ start: z.string(), end: z.string() }).optional().catch(undefined),
  })
);

const iocsSchema = lazySchema(() => {
  const iocList = z
    .array(z.object({ value: z.string(), comment: z.string().optional() }))
    .optional()
    .catch(undefined);
  return z.object({
    affected_hosts: iocList,
    compromised_identities: iocList,
    ips: iocList,
    shas: iocList,
    file_paths: iocList,
    malicious_commands: iocList,
    ransom_note: iocList,
    encryption_marker: iocList,
  } satisfies Record<IocKind, typeof iocList>);
});

const attackSchema = lazySchema(() =>
  z.object({
    title: z.string().optional().catch(undefined),
    alert_ids: z.array(z.string()).catch([]),
    mitre_attack_tactics: z.array(z.string()).optional().catch(undefined),
    replacements: z.record(z.string(), z.string()).optional().catch(undefined),
  })
);

/** The current data of an active attachment, by id. */
export const getAttachmentData = (
  attachments: readonly VersionedAttachment[],
  id: string
): unknown => {
  const attachment = attachments.find((candidate) => candidate.id === id);
  if (!attachment || attachment.active === false) {
    return undefined;
  }
  return getLatestVersion(attachment)?.data;
};

/** What the Endpoint Analysis run and the Attack Discovery review left on the Investigation. */
export const readForensicsAttachments = (
  attachments: readonly VersionedAttachment[],
  kiId: string
): Pick<ForensicsSummaryInputs, 'timeline' | 'iocs' | 'attack'> => {
  const ids = getForensicsAttachmentIds(kiId);
  const timeline = timelineSchema.safeParse(getAttachmentData(attachments, ids.timeline));
  const iocs = iocsSchema.safeParse(getAttachmentData(attachments, ids.iocs));
  const attack = attackSchema.safeParse(
    getAttachmentData(attachments, ATTACK_DISCOVERY_ATTACHMENT_ID)
  );
  return {
    timeline: timeline.success ? timeline.data : undefined,
    iocs: iocs.success ? iocs.data : undefined,
    attack: attack.success
      ? {
          title: attack.data.title
            ? toPlainAttackTitle(attack.data.title, attack.data.replacements)
            : undefined,
          tactics: attack.data.mitre_attack_tactics ?? [],
          alertIds: attack.data.alert_ids,
        }
      : undefined,
  };
};

const ALERT_FIELDS = [
  'kibana.alert.rule.name',
  'kibana.alert.severity',
  'kibana.alert.risk_score',
] as const;

/** `fields` returns each value as an array, whether the alert stores it dotted or nested. */
const alertFieldsSchema = lazySchema(() =>
  z.object({
    'kibana.alert.rule.name': z.tuple([z.string()], z.unknown()).catch(['Unknown rule']),
    'kibana.alert.severity': z.tuple([z.string()], z.unknown()).catch(['low']),
    'kibana.alert.risk_score': z.tuple([z.number()], z.unknown()).catch([0]),
  })
);

/** The attack's highest-risk detection alerts that are still in the space's alert index. */
export const readAttackAlerts = async ({
  esClient,
  spaceId,
  alertIds,
  abortSignal,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  alertIds: readonly string[];
  abortSignal?: AbortSignal;
}): Promise<ForensicsAlert[]> => {
  if (alertIds.length === 0) {
    return [];
  }
  const response = await esClient.search(
    {
      index: `.alerts-security.alerts-${spaceId}`,
      ignore_unavailable: true,
      allow_no_indices: true,
      size: MAX_ALERTS,
      sort: [{ 'kibana.alert.risk_score': { order: 'desc', unmapped_type: 'float' } }],
      _source: false,
      fields: [...ALERT_FIELDS],
      query: { ids: { values: alertIds.slice(0, MAX_ALERT_IDS) } },
    },
    { signal: abortSignal }
  );
  return response.hits.hits.map(({ fields }) => {
    const {
      'kibana.alert.rule.name': [ruleName],
      'kibana.alert.severity': [severity],
      'kibana.alert.risk_score': [riskScore],
    } = alertFieldsSchema.parse(fields ?? {});
    return { ruleName, severity, riskScore };
  });
};
