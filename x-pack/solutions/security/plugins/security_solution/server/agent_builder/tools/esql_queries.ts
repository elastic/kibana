/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Generates an ESQL query for security alerts with a configurable WHERE clause.
 * @param indexName - The index name to query
 * @param whereClause - The WHERE clause to use (without the "WHERE" keyword)
 * @returns The complete ESQL query string
 */
export const getAlertsEsqlQuery = (indexName: string, whereClause: string): string => {
  return `FROM ${indexName}
METADATA _id, _index
| WHERE ${whereClause}
| KEEP
  @timestamp,
  message,

  /* Host */
  host.name,
  host.os.name,
  host.os.version,
  host.asset.criticality,
  host.risk.calculated_level,
  host.risk.calculated_score_norm,

  /* User */
  user.name,
  user.domain,
  user.asset.criticality,
  user.risk.calculated_level,
  user.risk.calculated_score_norm,
  user.target.name,

  /* Process */
  process.name,
  process.pid,
  process.args,
  process.command_line,
  process.executable,
  process.exit_code,
  process.working_directory,
  process.pe.original_file_name,
  process.hash.md5,
  process.hash.sha1,
  process.hash.sha256,
  process.code_signature.exists,
  process.code_signature.signing_id,
  process.code_signature.status,
  process.code_signature.subject_name,
  process.code_signature.trusted,

  /* Process parent */
  process.parent.name,
  process.parent.args,
  process.parent.args_count,
  process.parent.command_line,
  process.parent.executable,
  process.parent.code_signature.exists,
  process.parent.code_signature.status,
  process.parent.code_signature.subject_name,
  process.parent.code_signature.trusted,

  /* File */
  file.name,
  file.path,
  file.hash.sha256,
  /* Groups */
  group.id,
  group.name,

  /* Cloud */
  cloud.provider,
  cloud.region,
  cloud.availability_zone,

  /* Network / DNS */
  source.ip,
  destination.ip,
  network.protocol,
  dns.question.name,
  dns.question.type,

  /* Event */
  event.category,
  event.dataset,
  event.module,
  event.outcome,

  /* Rule (generic) */
  rule.name,
  rule.reference,

  /* Kibana alert fields */
  kibana.alert.original_time,
  kibana.alert.severity,
  kibana.alert.workflow_status,
  kibana.alert.risk_score,
  kibana.alert.rule.name,
  kibana.alert.rule.description,
  kibana.alert.rule.references,
  kibana.alert.rule.threat.framework,
  kibana.alert.rule.threat.tactic.id,
  kibana.alert.rule.threat.tactic.name,
  kibana.alert.rule.threat.tactic.reference,
  kibana.alert.rule.threat.technique.id,
  kibana.alert.rule.threat.technique.name,
  kibana.alert.rule.threat.technique.reference,
  kibana.alert.rule.threat.technique.subtechnique.id,
  kibana.alert.rule.threat.technique.subtechnique.name,
  kibana.alert.rule.threat.technique.subtechnique.reference,

  /* Threat (top-level) */
  threat.framework,
  threat.tactic.id,
  threat.tactic.name,
  threat.tactic.reference,
  threat.technique.id,
  threat.technique.name,
  threat.technique.reference,
  threat.technique.subtechnique.id,
  threat.technique.subtechnique.name,
  threat.technique.subtechnique.reference,

  /* Custom ransomware fields */

  /* Metadata (available via METADATA clause) */
  _id,
  _index
`;
};

