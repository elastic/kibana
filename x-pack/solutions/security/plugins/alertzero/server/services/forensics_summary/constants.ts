/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The context-engine index the Endpoint Analysis indicators live in. */
export const FORENSICS_AI_INDEX_ID = 'security-investigations' as const;

/** The indicator type the Forensics Watch writes per Investigation it analyzes. */
export const ANALYZE_ENDPOINT_KI_TYPE = 'security.analyze_endpoint' as const;

/** The fixed id the Attack Discovery review attaches the attack under. */
export const ATTACK_DISCOVERY_ATTACHMENT_ID = 'attack-discovery' as const;

/** The action whose pending proposal reaches every alert of the attack. */
export const CLOSE_ATTACK_ACTION_WORKFLOW_ID =
  'system-alertzero-action-close-attack-discovery-investigation' as const;

export const FORENSICS_SUMMARY_TITLE = 'Forensics summary' as const;

const SUMMARY_CARD_ID_PREFIX = 'forensic-summary-';

/** Whether an attachment id is one of the forensics summary cards, whichever analysis or generation. */
export const isForensicsSummaryCardId = (attachmentId: string): boolean =>
  attachmentId.startsWith(SUMMARY_CARD_ID_PREFIX);

/** The ids the Endpoint Analysis run writes its findings under, and the card's own. */
export const getForensicsAttachmentIds = (kiId: string) =>
  ({
    timeline: `forensic-timeline-${kiId}`,
    iocs: `forensic-iocs-${kiId}`,
    summary: `${SUMMARY_CARD_ID_PREFIX}${kiId}`,
  } as const);

/**
 * The id of the summary card posted as the given generation. Each post is a new attachment, so the chat can
 * drop the one before it; the first keeps the plain id.
 */
export const getForensicsSummaryCardId = (kiId: string, generation: number): string => {
  const { summary } = getForensicsAttachmentIds(kiId);
  return generation <= 1 ? summary : `${summary}-${generation}`;
};

/** The generation a summary card id was posted as, or undefined when the id is not one of the analysis's cards. */
export const getForensicsSummaryCardGeneration = (
  kiId: string,
  attachmentId: string
): number | undefined => {
  const { summary } = getForensicsAttachmentIds(kiId);
  if (attachmentId === summary) {
    return 1;
  }
  const suffix = attachmentId.startsWith(`${summary}-`)
    ? attachmentId.slice(summary.length + 1)
    : '';
  return /^[1-9][0-9]{0,5}$/.test(suffix) ? Number(suffix) : undefined;
};

export const MAX_PROPOSALS = 50;
export const MAX_TIMELINE_EVENTS = 8;
export const MAX_ALERTS = 8;
export const MAX_IOCS_PER_KIND = 3;
/** Bounds the alert lookup; an attack correlates at most this many alerts in its attachment. */
export const MAX_ALERT_IDS = 1000;

/** MITRE ATT&CK enterprise tactics in kill-chain order, with a label that fits a chip. */
export const KILL_CHAIN_TACTICS = [
  { name: 'Reconnaissance', short: 'Recon' },
  { name: 'Resource Development', short: 'Resources' },
  { name: 'Initial Access', short: 'Initial' },
  { name: 'Execution', short: 'Execution' },
  { name: 'Persistence', short: 'Persist' },
  { name: 'Privilege Escalation', short: 'Priv Esc' },
  { name: 'Defense Evasion', short: 'Evasion' },
  { name: 'Credential Access', short: 'Creds' },
  { name: 'Discovery', short: 'Discovery' },
  { name: 'Lateral Movement', short: 'Lateral' },
  { name: 'Collection', short: 'Collect' },
  { name: 'Command and Control', short: 'C2' },
  { name: 'Exfiltration', short: 'Exfil' },
  { name: 'Impact', short: 'Impact' },
] as const;

/**
 * The IoC attachment's categories in reading order, each with its `--cc-vis-*` color index. EUI's palette
 * alternates a strong color and its light tint, so the kinds the entity graph draws get strong ones.
 */
export const IOC_KINDS = [
  { key: 'affected_hosts', label: 'Hosts', color: 0 },
  { key: 'compromised_identities', label: 'Identities', color: 2 },
  { key: 'ips', label: 'Network', color: 4 },
  { key: 'shas', label: 'File hashes', color: 6 },
  { key: 'file_paths', label: 'Files and keys', color: 8 },
  { key: 'malicious_commands', label: 'Commands', color: 1 },
  { key: 'ransom_note', label: 'Ransom notes', color: 3 },
  { key: 'encryption_marker', label: 'Encryption markers', color: 5 },
] as const;

/** The class that colors an indicator kind: `k` and its `--cc-vis-*` index. */
export const getIocKindClass = (key: IocKind): string =>
  `k${IOC_KINDS.find((kind) => kind.key === key)?.color ?? 0}`;

export type IocKind = (typeof IOC_KINDS)[number]['key'];
