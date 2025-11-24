/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { internalNamespaces } from '@kbn/onechat-common/base/namespaces';

/**
 * Creates a security tool ID with the core.security namespace.
 */
export const securityTool = (toolName: string): string => {
  return `${internalNamespaces.coreSecurity}.${toolName}`;
};

/**
 * Essential fields to return for security alerts to reduce context window usage.
 * These fields contain the most relevant information for security analysis.
 */
export const ESSENTIAL_ALERT_FIELDS = [
  '_id',
  '@timestamp',
  'message',

  /* Host */
  'host.name',
  'host.ip',
  'host.os.name',
  'host.os.version',
  'host.asset.criticality',
  'host.risk.calculated_level',
  'host.risk.calculated_score_norm',

  /* User */
  'user.name',
  'user.domain',
  'user.asset.criticality',
  'user.risk.calculated_level',
  'user.risk.calculated_score_norm',
  'user.target.name',

  /* Service */
  'service.name',
  'service.id',

  /* Entity */
  'entity.id',
  'entity.name',
  'entity.type',
  'entity.sub_type',

  /* Agent */
  'agent.id',

  /* Process */
  'process.name',
  'process.pid',
  'process.args',
  'process.command_line',
  'process.executable',
  'process.exit_code',
  'process.working_directory',
  'process.pe.original_file_name',
  'process.hash.md5',
  'process.hash.sha1',
  'process.hash.sha256',
  'process.code_signature.exists',
  'process.code_signature.signing_id',
  'process.code_signature.status',
  'process.code_signature.subject_name',
  'process.code_signature.trusted',

  /* Process parent */
  'process.parent.name',
  'process.parent.args',
  'process.parent.args_count',
  'process.parent.command_line',
  'process.parent.executable',
  'process.parent.code_signature.exists',
  'process.parent.code_signature.status',
  'process.parent.code_signature.subject_name',
  'process.parent.code_signature.trusted',

  /* File */
  'file.name',
  'file.path',
  'file.Ext.original.path',
  'file.hash.sha256',

  /* Groups */
  'group.id',
  'group.name',

  /* Cloud */
  'cloud.provider',
  'cloud.account.name',
  'cloud.service.name',
  'cloud.region',
  'cloud.availability_zone',

  /* Network / DNS */
  'source.ip',
  'destination.ip',
  'network.protocol',
  'dns.question.name',
  'dns.question.type',

  /* Event */
  'event.category',
  'event.action',
  'event.type',
  'event.code',
  'event.dataset',
  'event.module',
  'event.outcome',

  /* Rule (generic) */
  'rule.name',
  'rule.reference',

  /* Kibana alert fields */
  'kibana.alert.uuid',
  'kibana.alert.original_time',
  'kibana.alert.severity',
  'kibana.alert.start',
  'kibana.alert.workflow_status',
  'kibana.alert.reason',
  'kibana.alert.risk_score',
  'kibana.alert.rule.name',
  'kibana.alert.rule.rule_id',
  'kibana.alert.rule.description',
  'kibana.alert.rule.category',
  'kibana.alert.rule.references',
  'kibana.alert.rule.threat.framework',
  'kibana.alert.rule.threat.tactic.id',
  'kibana.alert.rule.threat.tactic.name',
  'kibana.alert.rule.threat.tactic.reference',
  'kibana.alert.rule.threat.technique.id',
  'kibana.alert.rule.threat.technique.name',
  'kibana.alert.rule.threat.technique.reference',
  'kibana.alert.rule.threat.technique.subtechnique.id',
  'kibana.alert.rule.threat.technique.subtechnique.name',
  'kibana.alert.rule.threat.technique.subtechnique.reference',

  /* Threat (top-level) */
  'threat.framework',
  'threat.tactic.id',
  'threat.tactic.name',
  'threat.tactic.reference',
  'threat.technique.id',
  'threat.technique.name',
  'threat.technique.reference',
  'threat.technique.subtechnique.id',
  'threat.technique.subtechnique.name',
  'threat.technique.subtechnique.reference',
] as const;
