/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';

const client = new Client({ node: 'http://localhost:9200' });

export async function installPackage(packageName: string): Promise<boolean> {
  try {
    const response = await client.transport.request({
      method: 'POST',
      path: `/api/fleet/epm/packages/${packageName}/1.0.0`,
    });
    return response.statusCode === 200;
  } catch (error) {
    console.error(`Failed to install package ${packageName}:`, error);
    return false;
  }
}

export async function startMLJob(jobId: string): Promise<void> {
  try {
    await client.ml.openJob({ job_id: jobId });
    await client.ml.startDatafeed({ datafeed_id: `datafeed-${jobId}` });
  } catch (error) {
    console.error(`Failed to start ML job ${jobId}:`, error);
  }
}

export async function createIndex(indexName: string): Promise<void> {
  try {
    await client.indices.create({ index: indexName });
  } catch (error) {
    console.error(`Failed to create index ${indexName}:`, error);
  }
}

export async function createComponentTemplate(templateName: string): Promise<void> {
  try {
    await client.cluster.putComponentTemplate({
      name: templateName,
      body: { template: { settings: {} } },
    });
  } catch (error) {
    console.error(`Failed to create component template ${templateName}:`, error);
  }
}

export async function setupRollupJob(jobId: string): Promise<void> {
  try {
    await client.rollup.putJob({
      id: jobId,
      body: {
        index_pattern: 'privileged_access_detection-*',
        rollup_index: 'rolled-privileged_access_detection',
        cron: '0 0 0 * * ?',
        page_size: 1000,
        groups: {
          date_histogram: {
            field: '@timestamp',
            calendar_interval: '1d',
          },
        },
      },
    });
  } catch (error) {
    console.error(`Failed to set up rollup job ${jobId}:`, error);
  }
}
