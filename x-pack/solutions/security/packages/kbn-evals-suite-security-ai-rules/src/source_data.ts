/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import { sampleRules } from '../datasets/sample_rules';
import { standardPairs } from '../datasets/standard_pairs';
import { complexPairs } from '../datasets/complex_pairs';
import { hardCases } from '../datasets/hard_cases';
import { negativePairs } from '../datasets/negative_pairs';

const SEED_LABEL = 'labels.security_ai_rules_seed';

interface Source {
  dataset: string;
  fields: Record<string, string | number | string[]>;
}

// Keep source-specific fields out of unrelated datasets: the negative examples
// intentionally ask for detections which the stated source cannot support.
const sources: Source[] = [
  {
    dataset: 'endpoint.events.process',
    fields: {
      'host.os.type': 'windows',
      'host.id': 'synthetic-host',
      'event.category': ['process'],
      'event.type': ['start'],
      'event.action': 'start',
      'process.name': 'notepad.exe',
      'process.executable': 'C:\\Windows\\System32\\notepad.exe',
      'process.args': ['notepad.exe', 'example.txt'],
      'process.command_line': 'notepad.exe example.txt',
      'process.parent.name': 'explorer.exe',
      'process.parent.executable': 'C:\\Windows\\explorer.exe',
      'process.parent.args': ['explorer.exe'],
      'process.parent.command_line': 'explorer.exe',
      'process.pe.original_file_name': 'NOTEPAD.EXE',
      'process.env_vars': ['PATH=C:\\Windows'],
      'process.entry_leader.entry_meta.type': 'init',
      'process.code_signature.subject_name': 'Synthetic publisher',
      'file.name': 'example.txt',
      'file.path': 'C:\\Users\\synthetic\\example.txt',
      'file.Ext.original.name': 'example.txt',
      'source.ip': '192.0.2.10',
      'destination.ip': '198.51.100.10',
      'destination.port': 443,
    },
  },
  {
    dataset: 'windows.sysmon_operational',
    fields: {
      'host.os.type': 'windows',
      'event.code': '10',
      'winlog.event_data.TargetImage': 'C:\\Windows\\System32\\notepad.exe',
      'winlog.event_data.GrantedAccess': '0x1000',
      'winlog.event_data.CallTrace': 'C:\\Windows\\System32\\ntdll.dll',
    },
  },
  {
    dataset: 'windows.powershell_operational',
    fields: {
      'host.os.type': 'windows',
      'event.code': '4104',
      'event.category': ['process'],
      'powershell.file.script_block_text': 'Write-Output "synthetic fixture"',
    },
  },
  {
    dataset: 'aws.cloudtrail',
    fields: {
      'event.provider': 'route53resolver.amazonaws.com',
      'event.action': 'ListResolverQueryLogConfigs',
    },
  },
  {
    dataset: 'azure.auditlogs',
    fields: {
      'azure.auditlogs.operation_name': 'Read service principal',
      'azure.auditlogs.identity': 'synthetic-user',
    },
  },
  { dataset: 'gcp.audit', fields: { 'event.action': 'google.logging.v2.ConfigServiceV2.GetSink' } },
  {
    dataset: 'o365.audit',
    fields: {
      'event.provider': 'Exchange',
      'event.action': 'MailItemsAccessed',
      'event.category': ['web'],
      'o365.audit.UserType': '0',
      'o365.audit.ExtendedProperties.RequestType': 'Interactive',
      'o365.audit.ExtendedProperties.ResultStatusDetail': 'Success',
      'related.user': ['synthetic@example.invalid'],
      'rule.name': 'Synthetic audit event',
    },
  },
  {
    dataset: 'google_workspace.admin',
    fields: {
      'event.action': 'VIEW_SETTING',
      'google_workspace.event.type': 'ORG_SETTINGS',
      'google_workspace.admin.setting.name': 'SyntheticSetting',
    },
  },
  {
    dataset: 'network_traffic.flow',
    fields: {
      'event.category': ['network'],
      'source.ip': '192.0.2.10',
      'destination.ip': '198.51.100.10',
      'destination.port': 443,
      'network.transport': 'tcp',
    },
  },
  {
    dataset: 'okta.system',
    fields: {
      'okta.event_type': 'user.session.start',
      'okta.actor.id': 'synthetic-user',
      'okta.actor.display_name': 'Synthetic User',
      'okta.authentication_context.external_session_id': 'synthetic-session',
    },
  },
];

const alertSource: Source = {
  dataset: 'security.alerts',
  fields: {
    'event.kind': 'signal',
    'host.os.type': 'linux',
    'kibana.alert.rule.rule_id': 'synthetic-rule',
  },
};

export const createSourceDataRunId = (): string =>
  `air-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export function getReferencedIndexPatterns(): string[] {
  const rules = [...sampleRules, ...standardPairs, ...complexPairs];
  const texts = [
    ...rules.flatMap((rule) => [rule.prompt, rule.esqlQuery ?? rule.query]),
    ...hardCases.flatMap((rule) => [rule.prompt, rule.output.query]),
    ...negativePairs.map((pair) => `Available data: ${pair.availableData}`),
  ];
  return [
    ...new Set(
      texts.flatMap((text) => {
        const available = [...text.matchAll(/Available data: ([.a-z0-9_*-]+)/g)].map(
          (match) => match[1]
        );
        const from = [...text.matchAll(/\bFROM ([.a-z0-9_*,-]+)/g)].flatMap((match) =>
          match[1].split(',')
        );
        return [...available, ...from];
      })
    ),
  ].sort();
}

export function getSourceDataPlan(runId: string, now = new Date()) {
  if (!/^[a-z0-9-]+$/.test(runId)) {
    throw new Error('Source data run ID must contain only lowercase letters, digits and hyphens');
  }
  return [...sources, alertSource].map((source) => {
    const isAlert = source === alertSource;
    const index = isAlert
      ? `.alerts-security.ai-rules-${runId}`
      : `logs-${source.dataset}-${runId}`;
    const document = {
      '@timestamp': now.toISOString(),
      'ecs.version': '9.0.0',
      'event.kind': 'event',
      'event.outcome': 'success',
      'event.dataset': source.dataset,
      [SEED_LABEL]: runId,
      ...(!isAlert
        ? {
            'data_stream.type': 'logs',
            'data_stream.dataset': source.dataset,
            'data_stream.namespace': runId,
          }
        : {}),
      ...source.fields,
    };
    const properties: Record<string, MappingProperty> = Object.fromEntries(
      Object.entries(document).map(([field, value]) => [
        field,
        {
          type:
            field === '@timestamp'
              ? 'date'
              : field.endsWith('.ip')
              ? 'ip'
              : typeof value === 'number'
              ? 'long'
              : 'keyword',
        } as MappingProperty,
      ])
    );
    return { index, isAlert, document, mappings: { properties } };
  });
}

export async function assertSourceDataCoverage(esClient: Client, runId: string): Promise<void> {
  for (const index of getReferencedIndexPatterns()) {
    const { count } = await esClient.count({
      index,
      expand_wildcards: 'all',
      allow_no_indices: true,
      ignore_unavailable: true,
      query: { term: { [SEED_LABEL]: runId } },
    });
    if (count === 0) {
      throw new Error(`No security-ai-rules fixture documents match referenced pattern ${index}`);
    }
  }
}

export async function seedSourceData(esClient: Client, runId: string): Promise<void> {
  const plan = getSourceDataPlan(runId);
  for (const source of plan) {
    if (source.isAlert) {
      await esClient.indices.create({
        index: source.index,
        settings: { 'index.hidden': true },
        mappings: source.mappings,
      });
    } else {
      await esClient.indices.putIndexTemplate({
        name: source.index,
        index_patterns: [source.index],
        priority: 501,
        data_stream: {},
        template: { mappings: source.mappings },
      });
      await esClient.indices.createDataStream({ name: source.index });
    }
  }
  const response = await esClient.bulk({
    refresh: 'wait_for',
    operations: plan.flatMap(({ index, document }) => [
      { create: { _index: index, _id: runId } },
      document,
    ]),
  });
  if (response.errors) {
    const errors = response.items.flatMap((item) =>
      item.create?.error ? [item.create.error] : []
    );
    throw new Error(`Could not seed security-ai-rules source data: ${JSON.stringify(errors)}`);
  }
  await assertSourceDataCoverage(esClient, runId);
}

export async function cleanupSourceData(esClient: Client, runId: string): Promise<void> {
  // Names are known before setup so partial failures can also be cleaned up.
  for (const { index, isAlert } of getSourceDataPlan(runId)) {
    if (isAlert) {
      await esClient.indices.delete({ index }, { ignore: [404] });
    } else {
      await esClient.indices.deleteDataStream({ name: index }, { ignore: [404] });
      await esClient.indices.deleteIndexTemplate({ name: index }, { ignore: [404] });
    }
  }
}

const globToRegExp = (pattern: string) =>
  new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);

/** Referenced index patterns that no planned fixture index would match. */
export function findUncoveredPatterns(patterns: string[], plannedIndices: string[]): string[] {
  return patterns.filter((pattern) => {
    const regexp = globToRegExp(pattern);
    return !plannedIndices.some((index) => regexp.test(index));
  });
}
