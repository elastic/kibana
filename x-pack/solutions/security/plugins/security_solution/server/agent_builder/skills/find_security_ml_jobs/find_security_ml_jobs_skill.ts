/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import type { EntityAnalyticsRoutesDeps } from '../../../lib/entity_analytics/types';
import { extractEuidFromMlDataTool, findSecurityMlJobsTool } from './inline_tools';
import { SECURITY_GET_ENTITY_TOOL_ID } from '../../tools';

export interface FindSecurityMlJobsSkillsContext {
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices'];
  isEntityStoreV2Enabled: boolean;
  logger: Logger;
  ml: EntityAnalyticsRoutesDeps['ml'];
}

const getAnomalyKeepFields = (isEntityStoreV2Enabled: boolean) => {
  const fields = [
    '@timestamp',
    'job_id',
    'record_score',
    'partition_field_name',
    'partition_field_value',
    'actual',
    'typical',
    'influencer_field_name',
    'influencer_field_value',

    'user.name',

    'host.name',
    'agent.name',
    'process.name',
    'client.geo.country_name',
    'client.geo.region_name',
  ];

  if (isEntityStoreV2Enabled) {
    return [...fields, 'user.id', 'event.module', 'host.id'];
  }

  return fields;
};

export const findSecurityMlJobsSkill = (ctx: FindSecurityMlJobsSkillsContext) =>
  defineSkillType({
    id: 'find-security-ml-jobs',
    name: 'find-security-ml-jobs',
    basePath: 'skills/security/ml',
    description: `Guide to investigating anomalous and unusual behavior in your environment, especially related to security entities
(hosts, users, services, service accounts, privileged accounts). Detects: unusual or first-time access patterns
by users or service accounts, access to sensitive data or systems outside working hours, privileged accounts with unusual command
patterns, logins from multiple or unexpected geographic locations, lateral movement between systems, unusually large data downloads
or uploads, and data exfiltration to external domains.`,
    content: `# Guide to finding Security ML Jobs

## When to Use This Skill

Use this skill when:
- Investigating anomalous or unusual behavior in their environment
- Understanding whether any entities are engaging in suspicious activities like logging in during unusual hours or accessing the system from unexpected geographic locations.
- Finding out whether any privileged users have been accessing critical assets

## Related Skills
After using this skill, you may want to use:
- '~/skills/security/entities/entity-analytics' to get the entity's risk score, risk level and asset criticality.

## Process for finding security ML jobs

### 1. Identify relevant ML jobs
- Use the 'find.security.ml.jobs' tool to identify relevant ML jobs that can help answer the user's question or prompt
- The tool will return:
  - activeJobIds: A list of active ML job IDs that are relevant to the user's query
  - allJobs: A list of all ML jobs (active and inactive) that are relevant to the user's query, along with their descriptions and influencers
  - scoreThreshold: The anomaly score threshold to use when querying ML results (e.g. 75). The anomaly score must exceed this threshold to be considered a significant result.

### 2. Query ML job results
- If the previous step returned activeJobIds, use the 'platform.core.generate_esql' tool to generate ESQL queries to find anomaly records that exceed the anomaly score threshold.
- ONLY generate a query if activeJobIds.length > 0
- Provide this context to the 'platform.core.generate_esql' tool:
  "When generating ES|QL queries for machine learning jobs:
  You **MUST ONLY** query the .ml-anomalies-* indices (e.g. FROM .ml-anomalies-*)
  You **MUST ALWAYS** filter by activeJobIds using a WHERE clause (e.g. "WHERE job_id IN ({activeJobIds})") to ensure that you are only querying relevant and active ML jobs.
  You **MUST ONLY** return anomalies with a 'record_score' bigger than {scoreThreshold} (Anomaly threshold set in the UI settings). Use this filter: "| WHERE record_score > {scoreThreshold}".
  You **MUST ONLY** return anomalies with a 'result_type' of type 'record'. Use this filter: "WHERE result_type == \"record\"".
  You **MUST ALWAYS** return required fields. Use this command: "KEEP ${getAnomalyKeepFields(
    ctx.isEntityStoreV2Enabled
  ).join(', ')}"."

  Fields that you MUST use to answer the question:
    * record_score: The anomaly score.
    * @timestamp: The timestamp of the anomaly. This timestamp might be in a different timezone than the user's timezone. You should not compare this field with hour of the day to avoid timezone issues.
    * job_id: The job ID of the anomaly.
    * partition_field_name: The field used to segment the analysis.
    * partition_field_value: The value of the partition field.
    * actual: The anomalous value that triggered the anomaly creation.
    * typical: The typical value expected for the field.

### 3. Recommend other ML jobs to enable
- If there are no activeJobIds returned by the 'find.security.ml.jobs' tool but there are jobs in the allJobs list, recommend to the user to enable and start those jobs to get relevant insights for their investigation.
- If there are activeJobIds returned by the 'find.security.ml.jobs' tool but allJobs includes additional job IDs, recommend to the user to enable and start those additional jobs to get more comprehensive insights for their investigation.
- When recommending jobs to enable, ALWAYS provide the full job title

### 4. Execute query to find anomalies
- If the 'platform.core.generate_esql' tool returns a query, use the 'platform.core.execute_esql' tool to execute the query and get anomaly results

${
  ctx.isEntityStoreV2Enabled
    ? `
  ### 5. Extract EUIDs from anomaly results
- You MUST use the 'find.security.ml.jobs.extract_euid' tool to extract EUIDs from the anomaly records returned by the 'platform.core.execute_esql' tool.
- Pass the full list of anomaly records as the 'anomalyRecords' input. The tool automatically derives the entity type (host, user) from each record's fields.
- Use the '~/skills/security/entities/entity-analytics' skill with the 'security.get_entity' tool to look up risk scores and asset criticality for the entities using EUID.
- The EUIDs will be returned in the same order as the anomaly records.
  For example, if you have 10 anomaly records, you will get an array of 10 EUID results.
  If no EUID can be generated for a record, that entry will be undefined. Multiple EUIDs can be extracted from a single document.

  ### 6. Summarize findings including EUID
- Summarize the findings in a tabular format
- Summary table MUST include the following columns: @timestamp, EUID, job_id, record_score, partition_field_name, partition_field_value, actual, typical, and any relevant influencer fields (e.g. user.name, host.name, client.geo.country_name)
- Summary table MUST show ALL extracted EUIDs for each anomaly record. DO NOT omit EUIDs from the table.
- Then add 1-2 bullet points with key observations and insights based on the anomalies found in the results. For example, if you find anomalous logins from a specific geographic location, you might add a bullet point that says "There were multiple anomalous logins from Russia with high anomaly scores, which could indicate suspicious activity."
`
    : `
  ### 5. Summarize findings
- Summarize the findings in a tabular format
- Summary table must include the following columns: @timestamp, job_id, record_score, partition_field_name, partition_field_value, actual, typical, and any relevant influencer fields (e.g. user.name, host.name, client.geo.country_name)
- Then add 1-2 bullet points with key observations and insights based on the anomalies found in the results. For example, if you find anomalous logins from a specific geographic location, you might add a bullet point that says "There were multiple anomalous logins from Russia with high anomaly scores, which could indicate suspicious activity."
`
}

## Examples

### Example 1: Investigating anomalous user behavior

User query: Show users who downloaded unusually large data

Steps:
1. Use the 'find.security.ml.jobs' tool to find relevant ML jobs related to data download behavior for users.
2. The tool returns 3 activeJobIds = ["high_sent_bytes_destination_ip", "high_bytes_written_to_external_device", "high_count_remote_file_transfer"]
3. Use the 'platform.core.generate_esql' tool to generate the ES|QL query with the context provided above, including filtering by activeJobIds and anomaly score threshold.
4. Execute the generated ES|QL query using the 'platform.core.execute_esql' tool to get anomaly results.
${
  ctx.isEntityStoreV2Enabled
    ? `
  7. Use the 'find.security.ml.jobs.extract_euid' tool to extract EUIDs from the combined anomaly records returned by the 'platform.core.execute_esql' tool.
  8. Use the ~/skills/security/entities/entity-analytics skill and the 'security.get_entity' to look up the entity store profiles using the extracted EUIDs
  9. Summarize the findings in a table format and provide key insights based on the anomalies and entities found.
     Table MUST include the EUID column. If multiple EUIDs are extracted for a single anomaly record, include all EUIDs in the table (e.g. separate by comma or list them in the same cell).`
    : `
  7. Summarize the findings in a table format and provide key insights based on the anomalies found.`
}

`,
    getRegistryTools: () => {
      const tools = ['platform.core.execute_esql', 'platform.core.generate_esql'];
      if (ctx.isEntityStoreV2Enabled) {
        tools.push(SECURITY_GET_ENTITY_TOOL_ID);
      }
      return tools;
    },
    getInlineTools: () => {
      const tools = [findSecurityMlJobsTool(ctx)];
      if (ctx.isEntityStoreV2Enabled) {
        tools.push(extractEuidFromMlDataTool());
      }
      return tools;
    },
  });
