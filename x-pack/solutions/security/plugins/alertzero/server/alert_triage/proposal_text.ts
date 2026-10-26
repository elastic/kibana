/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPatternKeys, getField } from './pattern_key';

type AlertDocument = Record<string, unknown>;

const MAX_LISTED = 5;
const SHOWN = 2;
const NAME_LENGTH = 40;

const names = (docs: readonly AlertDocument[], field: string): string[] => [
  ...new Set(
    docs
      .map((doc) => getField(doc, field))
      .filter((value): value is string => typeof value === 'string' && value !== '')
  ),
];

const nameList = (values: readonly string[], noun: string): string =>
  values.length > MAX_LISTED
    ? `${values.length} ${noun}s`
    : [
        values
          .slice(0, SHOWN)
          .map((name) =>
            name.length > NAME_LENGTH ? `${name.slice(0, NAME_LENGTH - 3)}...` : name
          )
          .join(', '),
        values.length > SHOWN ? ` +${values.length - SHOWN}` : '',
      ].join('');

/** The hosts and users behind the alerts, worded for the proposal title: `on build-01 (svc-backup)`. */
export const buildEntitySummary = (docs: readonly AlertDocument[]): string => {
  const hosts = names(docs, 'host.name');
  const users = names(docs, 'user.name');
  if (hosts.length > 0 && users.length > 0) {
    return `on ${nameList(hosts, 'host')} (${nameList(users, 'user')})`;
  }
  if (hosts.length > 0) return `on ${nameList(hosts, 'host')}`;
  if (users.length > 0) return `for ${nameList(users, 'user')}`;
  return '';
};

const programOf = (doc: AlertDocument): string | undefined => {
  const path = getField(doc, 'process.executable');
  return typeof path === 'string' && path !== '' ? path.split(/[\\/]/).pop() : undefined;
};

const plural = (count: number, noun: string): string => `${count} ${noun}${count === 1 ? '' : 's'}`;

export type ProposalKind = 'keyed' | 'pooled' | 'overflow' | 'batch';

/**
 * What is inside a proposal, so a reviewer can judge a grown one: how varied the alerts are, and
 * when they are grouped by rule only or pooled from unrelated patterns.
 */
export const buildVarietySummary = (docs: readonly AlertDocument[], kind: ProposalKind): string => {
  const parts = [plural(docs.length, 'alert')];
  const hosts = names(docs, 'host.name').length;
  const users = names(docs, 'user.name').length;
  const programs = new Set(docs.map(programOf).filter(Boolean)).size;
  if (hosts > 0) parts.push(plural(hosts, 'host'));
  if (users > 0) parts.push(plural(users, 'user'));
  if (programs > 0) parts.push(`${programs} distinct program${programs === 1 ? '' : 's'}`);
  const lines = [parts.join(' · ')];
  if (kind === 'pooled') {
    lines.push('These alerts matched no other alert of their batch, so they are pooled.');
  } else if (docs.length > 0 && docs.every((doc) => buildPatternKeys(doc).strict === undefined)) {
    lines.push('These alerts have no program, file or registry field, so they group by rule only.');
  }
  return lines.join('\n');
};

/**
 * How earlier alerts of the same pattern were judged. Only worth a line when some were true
 * positives, because a pattern that was only ever a false positive says nothing new.
 */
const describeHistory = ({
  falsePositive,
  truePositive,
}: {
  falsePositive: number;
  truePositive: number;
}): string =>
  `${plural(
    falsePositive + truePositive,
    'earlier alert'
  )} with the same pattern in the last 30 days: ${falsePositive} false positive, ${truePositive} true positive.`;

/** The title and comment of the closure proposal. One builder serves create and revise. */
export const buildProposalText = ({
  alerts,
  ruleName,
  confidenceFloor,
  kind,
  history,
}: {
  alerts: readonly AlertDocument[];
  ruleName: string;
  confidenceFloor: number;
  kind: ProposalKind;
  history?: { falsePositive: number; truePositive: number };
}): { title: string; comment: string } => {
  const count = alerts.length;
  const entities = buildEntitySummary(alerts);
  const subject = count === 1 && entities !== '' ? 'alert' : `${plural(count, 'alert')}`;
  return {
    title: `Close ${subject}${entities !== '' ? ` ${entities}` : ''} as false positive`,
    comment: [
      `${plural(count, 'alert')} from rule "${ruleName}" ${
        count === 1 ? 'was' : 'were'
      } classified as false positives at or above the configured confidence floor (${confidenceFloor}).`,
      'Approving this proposal will close them with workflow_reason=false_positive.',
      '',
      buildVarietySummary(alerts, kind),
      ...(history && history.truePositive > 0 ? ['', describeHistory(history)] : []),
    ].join('\n'),
  };
};
