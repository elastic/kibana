/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import { FtrProviderContext } from '../../../ftr_provider_context';

const waitFor = (time: number = 1000) => new Promise((r) => setTimeout(r, time));

export function createTSDBHelper({ getService }: Pick<FtrProviderContext, 'getService'>) {
  const es = getService('es');
  const log = getService('log');

  async function downsampleTSDBIndex(
    index: string,
    {
      isStream,
      interval,
      deleteOriginal,
    }: { isStream: boolean; interval?: string; deleteOriginal?: boolean } = {
      isStream: true,
      interval: '1h',
      deleteOriginal: false,
    }
  ) {
    let sourceIndex = index;
    // block and downsample work only at index level, so no direct data stream access
    // there's some more work to do if a data stream is passed
    if (isStream) {
      log.info('Force a rollover for the data stream to get the backing "old_index"');
      const res = await es.indices.rollover({
        alias: index,
      });
      sourceIndex = res.old_index;
    }

    const downsampledTargetIndex = `${index}_downsampled`;
    log.info(`add write block to "${sourceIndex}" index...`);
    await es.indices.addBlock({ index: sourceIndex, block: 'write' });

    try {
      log.debug('Wait 1s before running the downsampling to avoid a null_pointer_exception');
      await waitFor(1000);

      log.info(`downsampling "${sourceIndex}" index...`);
      await es.indices.downsample({
        index: sourceIndex,
        target_index: downsampledTargetIndex,
        config: { fixed_interval: interval || '1h' },
      });
    } catch (err) {
      if (isStream) {
        const [exists, oldIndexExists] = await Promise.all([
          es.indices.getDataStream({ name: index }),
          es.indices.exists({ index: sourceIndex }),
        ]);
        log.debug(`Data stream exists: ${Boolean(exists)}; old_index exists: ${oldIndexExists}`);
      } else {
        const exists = await es.indices.exists({ index });
        log.debug(`Index exists: ${exists}`);
      }
      if (!err.message.match(/resource_already_exists_exception/)) {
        throw err;
      }
      log.info(`ignoring resource_already_exists_exception...`);
    }

    if (deleteOriginal) {
      log.info(`Deleting original index ${sourceIndex}`);
      await es.indices.delete({ index: sourceIndex });
    }

    return downsampledTargetIndex;
  }

  async function updateDataStreamTemplate(
    stream: string,
    mapping: Record<string, MappingProperty>,
    tsdb?: boolean
  ) {
    await es.cluster.putComponentTemplate({
      name: `${stream}_mapping`,
      template: {
        settings: tsdb
          ? {
              mode: 'time_series',
              routing_path: 'request',
            }
          : { mode: undefined },
        mappings: {
          properties: mapping,
        },
      },
    });
    log.info(`Updating ${stream} index template${tsdb ? ' for TSDB' : ''}...`);
    await es.indices.putIndexTemplate({
      name: `${stream}_index_template`,
      index_patterns: [stream],
      data_stream: {},
      composed_of: [`${stream}_mapping`],
      _meta: {
        description: `Template for ${stream} testing index`,
      },
    });
  }

  async function upgradeStreamToTSDB(stream: string, newMapping: Record<string, MappingProperty>) {
    // rollover to upgrade the index type to time_series
    // uploading a new mapping for the stream index using the provided metric/dimension list
    log.info(`Updating ${stream} data stream component template with TSDB stuff...`);
    await updateDataStreamTemplate(stream, newMapping, true);

    log.info('Rolling over the backing index for TSDB');
    await es.indices.rollover({
      alias: stream,
    });
  }

  async function downgradeTSDBtoStream(
    tsdbStream: string,
    oldMapping: Record<string, MappingProperty>
  ) {
    // strip out any time-series specific mapping
    for (const fieldMapping of Object.values(oldMapping || {})) {
      if ('time_series_metric' in fieldMapping) {
        delete fieldMapping.time_series_metric;
      }
      if ('time_series_dimension' in fieldMapping) {
        delete fieldMapping.time_series_dimension;
      }
    }
    log.info(`Updating ${tsdbStream} data stream component template with TSDB stuff...`);
    await updateDataStreamTemplate(tsdbStream, oldMapping, false);
    // rollover to downgrade the index type to regular stream
    log.info(`Rolling over the ${tsdbStream} data stream into a regular data stream...`);
    await es.indices.rollover({
      alias: tsdbStream,
    });
  }

  async function createDataStream(
    streamIndex: string,
    mappings: Record<string, MappingProperty>,
    tsdb: boolean = true
  ) {
    log.info(`Creating ${streamIndex} data stream component template...`);

    await updateDataStreamTemplate(streamIndex, mappings, tsdb);

    log.info(`Creating ${streamIndex} data stream index...`);
    await es.indices.createDataStream({
      name: streamIndex,
    });
  }

  async function deleteDataStream(streamIndex: string) {
    log.info(`Delete ${streamIndex} data stream index...`);
    await es.indices.deleteDataStream({ name: streamIndex });
    log.info(`Delete ${streamIndex} index template...`);
    await es.indices.deleteIndexTemplate({
      name: `${streamIndex}_index_template`,
    });
    log.info(`Delete ${streamIndex} data stream component template...`);
    await es.cluster.deleteComponentTemplate({
      name: `${streamIndex}_mapping`,
    });
  }

  return {
    createDataStream,
    deleteDataStream,
    downsampleTSDBIndex,
    upgradeStreamToTSDB,
    downgradeTSDBtoStream,
  };
}
