/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V.
 * Licensed under the Elastic License 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { Client } from '@elastic/elasticsearch';
// import { request } from 'http';
import fetch from 'node-fetch';


let client: ElasticsearchClient;

export function setElasticsearchClient(esClient: ElasticsearchClient) {
  client = esClient;
}

const authHeader = 'Basic ' + Buffer.from('elastic_ml:changeme').toString('base64');

const DATA_VIEW_NAME = 'PAD Anomaly Detection Data View';
// const MODULE_NAME = 'privileged_access_detection';

async function kibanaFetch(path: string, method = 'GET', body?: any) {
  const response = await fetch(`http://localhost:5601${path}`, {
    method,
    headers: {
      'kbn-xsrf': 'true',
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  return data;
}

export async function installPADIntegration(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:5601/api/fleet/epm/packages?category=beta', {
    method: 'GET',
    headers: {
      'kbn-xsrf': 'true',
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + Buffer.from('elastic_ml:changeme').toString('base64'),
    },
  });
  const json = await response.json();
  const padPackage = json.items.find((item: any) => item.title === 'Privileged Access Detection');
  // console.log('PAD Package:', padPackage);
  if (!padPackage) {
    console.error('❌ Privileged Access Detection package not found.');
    return false;
  }
  const installResponse = await fetch(`http://localhost:5601/api/fleet/epm/packages/${padPackage.name}/${padPackage.version}`, {
    method: 'POST',
    headers: {
      'kbn-xsrf': 'true',
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + Buffer.from('elastic_ml:changeme').toString('base64'),
    },
  });
  if (!installResponse.ok) {
    console.error('❌ Failed to install PAD integration:', installResponse.statusText);
    return false;
  }
  const installJson = await installResponse.json();
  if (installJson.error) {
    console.error('Error installing PAD integration:', installJson.error);
    return false; 
  }
  console.log('✅ PAD integration installed successfully.');
  return true;  
  } catch (error) {
    console.error('❌ Failed to install PAD integration:', error);
    return false;
  }
}

async function setupPADMlModule() {
  console.log('⚙️ Setting up PAD ML module...');
  // const availableModules = await kibanaFetch('/api/ml/modules');
  // const modulesJson = await availableModules.json();
  // console.log('Available ML modules:', modulesJson);
  const response = await fetch('http://localhost:5601/api/ml/modules/setup/logs-privileged_access_detection', {
    method: 'POST',
    headers: {
      'kbn-xsrf': 'true',
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + Buffer.from('elastic_ml:changeme').toString('base64'),
    },
    body: JSON.stringify({
      prefix: 'pad',
      groups: [],
      indexPatternName: 'logs-*',
      useDedicatedIndex: false,
      startDatafeed: true,
      start: Date.parse("2024-12-01T00:00:00Z"),
      end: Date.now()
    })
  });

  const json = await response.json();
  if (!response.ok) {
    console.error('❌ Failed to set up PAD ML Module:', json);
    return;
  }

  console.log('✅ PAD ML Module setup complete:', json);
}

async function verifyDataViewHasTimeField() {
  const dataViews = await kibanaFetch('/api/data_views');
  // console.log('Data Views:', dataViews);
  // const { dataViews } = await res.json();
  // console.log(dataViews);
  const dataView = dataViews.data_view.find((dv: any) => dv.name === DATA_VIEW_NAME);

  if (!dataView) {
    throw new Error(`❌ Data view not found: ${DATA_VIEW_NAME}`);
  }
  const dataViewId = dataView.id;
  const fullDataView = await kibanaFetch(`/api/data_views/data_view/${dataViewId}`);
  const timeField = fullDataView?.data_view?.timeFieldName;
  if (!timeField) {
    throw new Error(`❌ Data view "${DATA_VIEW_NAME}" does not have a time field. ML requires time-based indices.`);
  }

  console.log(`✅ Data view "${DATA_VIEW_NAME}" is time-based using field "${timeField}"`);
}


export async function createPADComponentTemplates(): Promise<void> {
  try {
    await client.cluster.putComponentTemplate({
      name: 'pad-component-template',
      template: {
        settings: {
          number_of_shards: 1,
          number_of_replicas: 1,
        },
      },
    });
    console.log('✅ PAD component template created successfully.');
  } catch (error) {
    console.error('❌ Failed to create PAD component template:', error);
  }
}

export async function createPADIndexTemplate(): Promise<void> {
  try {
    await client.indices.putIndexTemplate({
      name: 'pad-index-template',
      index_patterns: ['privileged_access_detection-*'],
      composed_of: ['pad-component-template'],
      template: {
        settings: {
          number_of_shards: 1,
          number_of_replicas: 1,
        },
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            user: { type: 'keyword' },
            action: { type: 'keyword' },
          },
        },
      },
    });
    console.log('✅ PAD index template created successfully.');
  } catch (error) {
    console.error('❌ Failed to create PAD index template:', error);
  }
}

export async function createPADIndex(): Promise<void> {
  try {
    await client.indices.create({
      index: 'privileged_access_detection-000001',
    });
    console.log('PAD index created successfully.');
  } catch (error) {
    if (error.meta?.body?.error?.type === 'resource_already_exists_exception') {
      console.warn('ℹ️ PAD index already exists.');
    } else {
    console.error('❌ Failed to create PAD index:', error);
    }
  }
}

export async function setupRollupJob(jobId: string): Promise<void> {
  try {
    await client.transform.putTransform({
      transform_id: 'pad-daily-transform',
      source: {
        index: ['privileged_access_detection-*'],
      },
      dest: {
        index: 'pad-daily-summary',
      },
      pivot: {
        group_by: {
          day: {
            date_histogram: {
              field: '@timestamp',
              calendar_interval: '1d',
            },
          },
          user: {
            terms: {
              field: 'user',
            },
          },
        },
        aggregations: {
          action_count: {
            value_count: {
              field: 'action',
            },
          },
        },
      },
      frequency: '1h',
      sync: {
        time: {
          field: '@timestamp',
          delay: '60s',
        },
      },
    });
    console.log('✅ PAD rollup job set up successfully.');
    await client.transform.startTransform({
        transform_id: 'pad-daily-transform',
    });
  } catch (error) {
    if (error.meta?.body?.error?.type === 'resource_already_exists_exception') {
      console.warn('ℹ️ PAD rollup job already exists.');
    } else {
      console.error('❌ Failed to set up PAD rollup job:', error);
    }
  }
}



export async function startPADMLJobs(): Promise<void> {
  try {
    const jobsResponse = await client.ml.getJobs();
    const padJobs = jobsResponse.jobs.filter((job) =>
      job.job_id.includes('privileged_access') // or your PAD integration prefix
    );

    for (const job of padJobs) {
      try {
        await client.ml.openJob({ job_id: job.job_id });
        console.log(`✅ Started PAD ML job: ${job.job_id}`);
      } catch (err: any) {
        if (err.meta?.body?.error?.type === 'resource_already_exists_exception') {
          console.warn(`ℹ️ Job already exists: ${job.job_id}`);
        } else if (err.meta?.body?.error?.type === 'job_already_opened') {
          console.warn(`ℹ️ Job already open: ${job.job_id}`);
        } else {
          console.error(`❌ Failed to open PAD job ${job.job_id}`, err);
        }
      }
    }
  } catch (err) {
    console.error('❌ Failed to fetch or start PAD ML jobs:', err);
  }
}

export async function createPADDataView(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:5601/api/data_views/data_view', {
      method: 'POST',
      headers: {
        'kbn-xsrf': 'true',
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from('elastic_ml:changeme').toString('base64'),
      },
      body: JSON.stringify({
        data_view: {
          title: 'logs-*,ml_okta_multiple_user_sessions_pad.all,ml_windows_privilege_type_pad.all',
          name: 'PAD Anomaly Detection Data View',
          timeFieldName: '@timestamp',
        }
      })
    });

    const json = await response.json();
    if (!response.ok) {
      if (
        response.status === 400 &&
        json.message &&
        json.message.toLowerCase().includes('duplicate data view')
      ) {
        console.warn('⚠️ PAD Data View already exists.');
        return true;
      }
      console.error('❌ Failed to create PAD Data View:', json);
      return false;
    }

    console.log('✅ Successfully created PAD Data View:', json);
    return true;
  } catch (error) {
    console.error('❌ Error creating PAD Data View:', error);
    return false;
  }
}


export async function enablePADDetectionRules(): Promise<boolean> {
  try {
    const authHeader = 'Basic ' + Buffer.from('elastic_ml:changeme').toString('base64');

  // Step 1: Find PAD detection rules
  const findResponse = await fetch('http://localhost:5601/api/detection_engine/rules/_find?filter=alert.attributes.tags:"Use Case: Privileged Access Detection"', {
    method: 'GET',
    headers: {
      'kbn-xsrf': 'true',
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
  });

  const rulesJson = await findResponse.json();
  // rulesJson.data.forEach((rule: any) => {
  //   console.log(`Name: ${rule.name}`);
  //   console.log(`Tags: ${rule.tags.join(', ')}`);
  //   console.log('---');
  // });
  const padRuleIds = rulesJson.data.map((rule: any) => rule.id);

  if (padRuleIds.length === 0) {
    console.log('No PAD rules found to enable.');
    return false;
  }

  // Step 2: Enable the rules
  const bulkEnableResponse = await fetch('http://localhost:5601/api/detection_engine/rules/_bulk_action', {
    method: 'POST',
    headers: {
      'kbn-xsrf': 'true',
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'enable',
      ids: padRuleIds,
    }),
  });

  if (!bulkEnableResponse.ok) {
    throw new Error(`Failed to enable PAD detection rules: ${bulkEnableResponse.statusText}`);
  }

  console.log(`✅ Enabled ${padRuleIds.length} PAD detection rules.`);
  return true;
  } catch (error) {
    console.error('Failed to enable PAD detection rules:', error);
    return false;
  }
}

export async function verifyPADInstallation(): Promise<boolean> {
  try {
    const indexExists = await client.indices.exists({ index: 'privileged_access_detection-*' });

    if (!indexExists) {
      console.warn('❌ PAD index not found: privileged_access_detection-*');
      return false;
    }

    // Get all ML jobs and search for PAD-related job
    // const currentUser = await client.security.getUser();
    // console.log('CurrentUser:' , currentUser);
    await verifyDataViewHasTimeField();
    const allJobs = await client.ml.getJobs();
    console.log('All ML Jobs:', allJobs);
    const padJob = allJobs.jobs.find((job) =>
      job.job_id.includes('preconfiguredtest') || job.job_id.includes('pad')
    );

    if (!padJob) {
      console.warn('❌ No PAD ML job found');
      return false;
    }

    // Now fetch stats for the found job
    const jobStats = await client.ml.getJobStats({ job_id: padJob.job_id });
    console.log(`✅ PAD ML job "${padJob.job_id}" found with stats:`, jobStats);

    return true;
  } catch (error) {
    console.error('❌ Failed to verify PAD installation:', error);
    return false;
  }
}

export async function setupPrivilegedMonitoringEngine(): Promise<void> {
  try {
    console.log('Installing PAD integration...');
    const installed = await installPADIntegration();
    if (!installed) return;
    await createPADDataView();
    await setupPADMlModule();
    await createPADComponentTemplates();
    await createPADIndexTemplate();
    await createPADIndex();
    await setupRollupJob('pad-rollup-job');
    await startPADMLJobs();
    await enablePADDetectionRules();
    await verifyPADInstallation();

    console.log('Privileged Monitoring Engine setup completed successfully.');
  } catch (error) {
    console.error('Failed to set up Privileged Monitoring Engine:', error);
  }
}

const esClient = new Client({ 
  node: 'http://localhost:9200', 
  auth: {
    username : "elastic_ml",
    password : "changeme"
  }, 
});
setElasticsearchClient(esClient);

setupPrivilegedMonitoringEngine();