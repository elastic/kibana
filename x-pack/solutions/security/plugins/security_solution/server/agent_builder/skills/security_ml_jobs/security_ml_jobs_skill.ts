/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import type { EntityAnalyticsRoutesDeps } from '../../../lib/entity_analytics/types';
import { getSecurityMlJobsTool } from './inline_tools';
export interface SecurityMlJobsSkillsContext {
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices'];
  logger: Logger;
  ml: EntityAnalyticsRoutesDeps['ml'];
}

export const getSecurityMlJobsSkill = (ctx: SecurityMlJobsSkillsContext) =>
  defineSkillType({
    id: 'find-security-ml-jobs',
    name: 'find-security-ml-jobs',
    basePath: 'skills/security/ml',
    description: `Guide to investigating anomalous and unusual behavior in your environment, especially related to security entities (hosts, users, services, generic). Analyze abnormal access patterns, lateral movements, unexpected logins from different locations, suspicious or external domain activities, large downloads.`,
    content: `# Guide to finding Security ML Jobs

## When to Use This Skill

Use this skill when:
- A user investigates anomalous or unusual behavior in their environment
- A user wants to understand whether any entities are engaging in suspicious activities like logging in during unusual hours or accessing the system from unexpected geographic locations.
- A user wants to find out whether any privileged users have been accessing critical assets

## Related Skills
After using this skill, you may want to use:
- '~/skills/security/entities/entity-analytics' to get the entity's risk score, risk level and asset criticality.

## Process for finding security ML jobs

### 1. Identify relevant ML jobs
- Use the 'security.ml.jobs' tool to identify relevant ML jobs that can help investigate the user's question or prompt
- The tool will return:
  - activeJobIds: A list of active ML job IDs that are relevant to the user's query
  - allJobs: A list of all ML jobs (active and inactive) that are relevant to the user's query, along with their descriptions and influencers
  - indices: A list of ML indices to query
  - scoreThreshold: The anomaly score threshold to use when querying ML results (e.g. 75). The anomaly score must exceed this threshold to be considered a significant result.

### 2. Query ML job results
- If there are activeJobIds, use the 'platform.core.generate_esql' tool to generate ESQL queries to find anomaly results that exceed the anomaly score threshold.
- Only generate a query if there are activeJobIds.length > 0 and indices.length > 0
- If indices.length > 1, you MUST call the 'platform.core.generate_esql' tool for EACH index, to ensure you are querying all relevant data. For example, if the 'security.ml.jobs' tool returns indices ["index1", "index2"], you should
  call the 'platform.core.generate_esql' tool two times: once with "index1" and once with "index2".
- Provide this context to the 'platform.core.generate_esql' tool:
  "When generating ES|QL queries for machine learning jobs:
  You **MUST ALWAYS** filter by activeJobIds using a WHERE clause (e.g. "WHERE job_id IN ({activeJobIds})") to ensure that you are only querying relevant and active ML jobs.
  You **MUST ONLY** return anomalies with a 'record_score' bigger than {scoreThreshold} (Anomaly threshold set in the UI settings). Use this filter: "| WHERE record_score > {scoreThreshold}".
  You **MUST ONLY** return anomalies with a 'result_type' of type 'record'. Use this filter: "WHERE result_type == \"record\"".
  ALWAYS return the job_id field

  Fields that you MUST use to answer the question:
    * record_score: The anomaly score.
    * @timestamp: The timestamp of the anomaly. This timestamp might be in a different timezone than the user's timezone. You should not compare this field with hour of the day to avoid timezone issues.
    * job_id: The job ID of the anomaly.
    * partition_field_name: The field used to segment the analysis.
    * partition_field_value: The value of the partition field.
    * actual: The anomalous value that triggered the anomaly creation.
    * typical: The typical value expected for the field.

    ### Common influencers fields (Other fields may be available depending on the job): user.name, host.name, agent.name, process.name, client.geo.country_name, client.geo.region_name

### 3. Recommend other ML jobs to enable
- If there are no activeJobIds returned by the 'security.ml.jobs' tool but there are jobs in the allJobs list, recommend to the user to enable and start those jobs to get relevant insights for their investigation.
- If there are activeJobIds returned by the 'security.ml.jobs' tool but allJobs includes additional job IDs, recommend to the user to enable and start those additional jobs to get more comprehensive insights for their investigation.
- When recommending jobs to enable, provide the full job title

### 4. Summarize findings
- If the 'platform.core.generate_esql' tool returns a query, use the 'platform.core.execute_esql' tool to execute the query and get anomaly results
- Summarize the findings in a tabular format
- Summary table must include the following columns: @timestamp, job_id, record_score, partition_field_name, partition_field_value, actual, typical, and any relevant influencer fields (e.g. user.name, host.name, client.geo.country_name)
- Then add 1-2 bullet points with key observations and insights based on the anomalies found in the results. For example, if you find anomalous logins from a specific geographic location, you might add a bullet point that says "There were multiple anomalous logins from Russia with high anomaly scores, which could indicate suspicious activity."

## Examples

### Example 1: Investigating anomalous user behavior

User query: Show users who downloaded unusually large data

Steps:
1. Use the 'security.ml.jobs' tool to find relevant ML jobs related to data download behavior for users.
2. The tool returns 3 activeJobIds = ["high_sent_bytes_destination_ip", "high_bytes_written_to_external_device", "high_count_remote_file_transfer"] and 3 indices = [".ml-anomalies-shared",".ml-anomalies-lmd",".ml-anomalies-ded"]
3. Use the 'platform.core.generate_esql' tool to generate the first ES|QL query for index ".ml-anomalies-shared" with the context provided above, including filtering by activeJobIds and anomaly score threshold.
4. Use the 'platform.core.generate_esql' tool to generate the second ES|QL query for index ".ml-anomalies-lmd" with the context provided above, including filtering by activeJobIds and anomaly score threshold.
5. Use the 'platform.core.generate_esql' tool to generate the third ES|QL query for index ".ml-anomalies-ded" with the context provided above, including filtering by activeJobIds and anomaly score threshold.
6. Execute each of the three generated ES|QL queries using the 'platform.core.execute_esql' tool to get anomaly results.
7. Summarize the findings in a table format and provide key insights based on the anomalies found.
`,
    getRegistryTools: () => ['platform.core.execute_esql', 'platform.core.generate_esql'],
    getInlineTools: () => [getSecurityMlJobsTool(ctx)],
  });
