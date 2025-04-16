/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V.
 * Licensed under the Elastic License 2.0.
 */

// import type { ElasticsearchClient } from '@kbn/core/server';
import { Client } from '@elastic/elasticsearch';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
// import { request } from 'http';
import fetch from 'node-fetch';
import { PRIVMON_ALL_DATA_FEED } from './SPIKE_privmon_ml_data_feeds';
import { PRIVMON_ML_JOBS } from './SPIKE_privmon_ml_jobs';



let client: Client;

export function setElasticsearchClient(esClient: Client) {
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

export async function installPADIntegration (): Promise<boolean> {
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

async function upsertCustomIngestPipeline(version: string) {
  const pipelineId = 'logs-endpoint.events.process@custom';
  const mlPipelineName = `${version}-ml_pad_ingest_pipeline`;

  let existingProcessors = [];

  try {
    const getResp = await client.ingest.getPipeline({ id: pipelineId });
    const existingPipeline = (getResp as Record<string, any>)[pipelineId];
    existingProcessors = existingPipeline?.processors || [];
  } catch (err) {
    if (err.statusCode === 404) {
      console.log(`⚠️ Pipeline '${pipelineId}' not found. Creating new one.`);
    } else {
      console.error(`Error checking pipeline '${pipelineId}':`, err);
      return;
    }
  }

  // Filter out any old ML PAD processors if they exist
  const filteredProcessors = existingProcessors.filter(
    (p: { pipeline?: { name?: string } }) => 
      !('pipeline' in p && p.pipeline?.name?.includes('ml_pad_ingest_pipeline'))
  );

  const mlProcessor = {
    pipeline: {
      name: mlPipelineName,
      ignore_missing_pipeline: true,
      ignore_failure: true,
    },
  };

  const updatedPipeline = {
    description: 'Custom endpoint pipeline with ML PAD processor',
    processors: [...filteredProcessors, mlProcessor],
  };

  try {
    await client.ingest.putPipeline({
      id: pipelineId,
      body: updatedPipeline as Record<string, any>,
    });
    console.log(`✅ Pipeline '${pipelineId}' upserted successfully.`);
  } catch (err) {
    console.error(`❌ Failed to upsert pipeline '${pipelineId}':`, err);
  }
}

async function verifyDataViewHasTimeField() {
  const dataViews = await kibanaFetch('/api/data_views');
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


export async function createPADComponentTemplates(version: string): Promise<void> {
  const templateName = 'pad-component-template@custom';

  try {
    let existingTemplate: any = null;

    try {
      const getResp = await client.cluster.getComponentTemplate({ name: templateName });
      existingTemplate = getResp.component_templates?.[0]?.component_template;
      console.log(`ℹ️ Component template '${templateName}' already exists.`);
    } catch (err) {
      if (err.statusCode === 404) {
        console.log(`ℹ️ Component template '${templateName}' does not exist. Will create new one.`);
      } else {
        throw err;
      }
    }

    // Start with settings
    const settings = {
      index: {
        default_pipeline: `${version}-ml_pad_ingest_pipeline`,
      },
      number_of_shards: 1,
      number_of_replicas: 1,
    };

    // Get existing mappings or initialize
    const existingMappings = existingTemplate?.template?.mappings || {};

    // Ensure the 'process' object and 'command_line_entropy' field
    const updatedMappings = {
      ...existingMappings,
      properties: {
        ...existingMappings.properties,
        process: {
          type: 'object',
          properties: {
            ...(existingMappings.properties?.process?.properties || {}),
            command_line_entropy: {
              type: 'double',
            },
          },
        },
      },
    };

    // Put (create or update) the component template
    await client.cluster.putComponentTemplate({
      name: templateName,
      template: {
        settings,
        mappings: updatedMappings,
      },
    });

    console.log(`✅ PAD component template '${templateName}' created/updated successfully.`);
  } catch (error) {
    console.error('❌ Failed to create or update PAD component template:', error);
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

export async function rolloverIndex(aliasName: string = 'logs-endpoint.events.process-default'): Promise<void> {
  try {
    const response = await client.indices.rollover({ alias: aliasName });

    if (response.rolled_over) {
      console.log(`✅ Successfully rolled over index for alias: ${aliasName}`);
    } else {
      console.log(`ℹ️ No rollover performed. Reason:`, response);
    }
  } catch (error) {
    console.error(`❌ Failed to rollover index for alias ${aliasName}:`, error);
  }
}

export async function checkPADTransformHealth(version: string): Promise<void> {
  const transforms = [
    `logs-pad.pivot_transform_okta_multiple_sessions-default-${version}`,
    `logs-pad.pivot_transform_windows_privilege_list-default-${version}`,
  ];

  try {
    const response = await client.transform.getTransformStats({ transform_id: transforms.join(',') });

    response.transforms.forEach((transform: any) => {
      const { id, state, stats, checkpointing } = transform;

      console.log(`🔍 Transform: ${id}`);
      console.log(`   🟢 State: ${state}`);
      console.log(`   ✅ Last checkpoint: ${checkpointing.last.checkpoint}, Time: ${checkpointing.last.timestamp}`);
      console.log(`   📊 Documents Processed: ${stats.documents_processed}, Pages Processed: ${stats.pages_processed}`);
      console.log('---');
    });
  } catch (error) {
    console.error('❌ Failed to fetch PAD transform health:', error.meta?.body?.error || error);
  }
}

const checkMLNodeMemory = async () => {
  const stats = await client.ml.getMemoryStats();
  // Find nodes and memory usage
  Object.entries(stats.nodes).forEach(([nodeId, node]: [string, any]) => {
    console.log(`  Node: ${nodeId}`);
    console.log(`  Name: ${node.name}`);
    console.log(`  Roles: ${node.roles?.join(', ')}`);
    console.log(`  Machine Memory: ${node.mem?.total_in_bytes}`);
    console.log(`  JVM Heap: ${node.jvm?.mem?.heap_max_in_bytes}`);
  });
};

const checkAndCloseIdleJobs = async () => {
  const jobStats = await client.ml.getJobStats({});
  
  jobStats.jobs.forEach((job: any) => {
    console.log(`Job ID: ${job.job_id}`);
    console.log(`State: ${job.state}`);
    console.log(`Model Size: ${job.model_size_stats.model_bytes}`);
    console.log(`Memory Status: ${job.model_size_stats.memory_status}`);
    if (job.state === 'opened' && job.model_size_stats.model_bytes > 5000000000) { // You can define the threshold
      console.log(`Closing job ${job.job_id} to free memory`);
      client.ml.closeJob({ job_id: job.job_id });
    }
  });
};


export async function createPADMLJobs(): Promise<void> {
  const jobs = PRIVMON_ML_JOBS;
  try {
    for (const job of jobs) {
      try {
        await client.ml.putJob({
          job_id: job.id,
          ...job.config,
        });
        console.log(`✅ Created PAD ML job: ${job.id}`);
      } catch (err: any) {
        if (err.meta?.body?.error?.type === 'resource_already_exists_exception') {
          console.warn(`ℹ️ Job already exists: ${job.id}`);
        } else {
          console.error(`❌ Failed to create PAD job ${job.id}`, err);
        }
      }
    }
  } catch (err) {
    console.error('❌ Failed to create PAD ML jobs:', err);
  }
}

export async function createPADMLDataFeed(): Promise<void> {
  
  const dataFeeds = PRIVMON_ALL_DATA_FEED
  try {
    for (const dataFeed of dataFeeds) {
      const cleanedQuery = {
  ...dataFeed.config.query,
  bool: {
    ...dataFeed.config.query.bool,
    filter: (dataFeed.config.query.bool.filter ?? []).map((f) => {
      if ('terms' in f) {
        const termKey = f.terms ? Object.keys(f.terms).find((key) => (f.terms as Record<string, any>)[key] !== undefined) : undefined;
        if (termKey) {
          return {
            terms: {
              [termKey]: (f.terms as Record<string, any>)[termKey]
            }
          };
        }
      }
      return f;
    }).filter((f) => f !== undefined)
  }
};

      try {
        await client.ml.putDatafeed({
        datafeed_id: dataFeed.id,
        indices: dataFeed.config.indices,
        job_id: dataFeed.config.job_id,
        query: cleanedQuery as QueryDslQueryContainer,
});
        console.log(`✅ Created data feed: ${dataFeed.id}`);
      } catch (err: any) {
        if (err.meta?.body?.error?.type === "resource_already_exists_exception") {
          console.warn(`ℹ️ Data feed already exists: ${dataFeed.id}`);
        } else {
          console.error(`❌ Failed to create data feed ${dataFeed.id}`, err);
        }
      }
    }
  } catch (err) {
    console.error("❌ Failed to create data feeds:", err);
  }
}


export async function startPADMLJobs(): Promise<void> {
  try {
    const jobsStatsResponse = await client.ml.getJobStats();
    
    const padJobs = jobsStatsResponse.jobs.filter((job) =>
  job.job_id.includes('privileged_access') || job.job_id.includes('pad')
);

  for (const job of padJobs) {
    const jobId = job.job_id;
    const jobState = job.state;

    if (jobState === 'opened') {
      console.log(`ℹ️ Job already open: ${jobId}`);
      continue;
    }

    try {
      await client.ml.openJob({ job_id: jobId });
      console.log(`✅ Started PAD ML job: ${jobId}`);
    } catch (err: any) {
      const errType = err.meta?.body?.error?.type;

      if (errType === 'resource_already_exists_exception') {
        console.warn(`ℹ️ Task already exists for job: ${jobId} (possibly still opening)`);
      } else if (errType === 'job_already_opened') {
        console.warn(`ℹ️ Job already open: ${jobId}`);
      } else {
        console.error(`❌ Failed to open PAD job ${jobId}`, err);
      }
    }
  }
} catch (err) {
    console.error('❌ Failed to fetch or start PAD ML jobs:', err);
  }
}


export async function createPADDataView(): Promise<boolean> {
  const dataViewId = 'pad-anomaly-detection-dataview';
  const title = 'logs-*,ml_okta_multiple_user_sessions_pad.all,ml_windows_privilege_type_pad.all';
  
  try {
    // Step 1: Check if data view already exists
    const checkResp = await fetch(`http://localhost:5601/api/data_views/data_view/${dataViewId}`, {
      method: 'GET',
      headers: {
        'kbn-xsrf': 'true',
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from('elastic_ml:changeme').toString('base64'),
      }
    });

    if (checkResp.ok) {
      console.warn('⚠️ PAD Data View already exists.');
      return true;
    }

    // Step 2: Create the data view
    const createResp = await fetch('http://localhost:5601/api/data_views/data_view', {
      method: 'POST',
      headers: {
        'kbn-xsrf': 'true',
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from('elastic_ml:changeme').toString('base64'),
      },
      body: JSON.stringify({
        data_view: {
          id: dataViewId,
          title: title,
          name: title,
          timeFieldName: '@timestamp',
        }
      })
    });

    const json = await createResp.json();
    if (!createResp.ok) {
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
    await createPADMLJobs();
    await upsertCustomIngestPipeline('0.0.1'); 
    await checkPADTransformHealth('0.0.1');
    await checkMLNodeMemory();
    await checkAndCloseIdleJobs();
    await createPADComponentTemplates('0.0.1');
    await createPADIndexTemplate();
    await createPADIndex();
    // await setupRollupJob('pad-rollup-job');
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