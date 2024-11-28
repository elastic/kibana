/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import type { FtrProviderContext } from '../ftr_provider_context';

/**
 * High level interface to operate with Elasticsearch data stream and TSDS/LogsDB.
 */
export function DataStreamProvider({ getService, getPageObject }: FtrProviderContext) {
  const es = getService('es');
  const log = getService('log');
  const retry = getService('retry');
  const common = getPageObject('common');

  const downsampleDefaultOptions = {
    isStream: true,
    interval: '1h',
    deleteOriginal: false,
  };

  /**
   * Downsample a data-stream or a specific backing index
   * @param indexOrStream An index or a data stream
   * @param options A set of options to configure the downsample.
   * @param options.isStream The most important option which is used to correctly handle data streams when passed (otherwise it will throw). Default is true.
   * @param options.interval The interval size for the downsampling. Default value is '1h'.
   * @param options.deleteOriginal Whether the original backing index (not data stream!) should be deleted after downsampling. Default to false.
   * @returns the name of the downsampled index
   */
  async function downsampleTSDBIndex(
    indexOrStream: string,
    {
      isStream = downsampleDefaultOptions.isStream,
      interval = downsampleDefaultOptions.interval,
      deleteOriginal = downsampleDefaultOptions.deleteOriginal,
    }: { isStream: boolean; interval?: string; deleteOriginal?: boolean } = downsampleDefaultOptions
  ) {
    let sourceIndex = indexOrStream;
    // block and downsample work only at index level, so no direct data stream access
    // there's some more work to do if a data stream is passed
    if (isStream) {
      log.info('Force a rollover for the data stream to get the backing "old_index"');
      const res = await es.indices.rollover({
        alias: indexOrStream,
      });
      sourceIndex = res.old_index;
    }

    const downsampledTargetIndex = `${indexOrStream}_downsampled`;
    log.info(`add write block to "${sourceIndex}" index...`);
    await es.indices.addBlock({ index: sourceIndex, block: 'write' });
    let waitTime = 1000;

    await retry.tryForTime(
      20000,
      async () => {
        log.debug(
          `Wait ${
            waitTime / 1000
          }s before running the downsampling to avoid a null_pointer_exception`
        );
        await common.sleep(waitTime);

        try {
          log.info(`downsampling "${sourceIndex}" index...`);
          await es.indices.downsample({
            index: sourceIndex,
            target_index: downsampledTargetIndex,
            config: { fixed_interval: interval || downsampleDefaultOptions.interval },
          });
        } catch (err) {
          // Ignore this specific errors
          if (err.message.match(/resource_already_exists_exception/)) {
            log.info(`ignoring resource_already_exists_exception...`);
            return;
          }
          // increase the waiting time exponentially?
          waitTime = waitTime * 1.5;
          // make it bubble up everything else
          throw err;
        }
      },
      async () => {
        // provide some debug info if the retry fails
        if (isStream) {
          const [exists, oldIndexExists] = await Promise.all([
            es.indices.getDataStream({ name: indexOrStream }),
            es.indices.exists({ index: sourceIndex }),
          ]);
          log.debug(`Data stream exists: ${Boolean(exists)}; old_index exists: ${oldIndexExists}`);
        } else {
          const exists = await es.indices.exists({ index: indexOrStream });
          log.debug(`Index exists: ${exists}`);
        }
      }
    );

    if (deleteOriginal) {
      log.info(`Deleting original index ${sourceIndex}`);
      await es.indices.delete({ index: sourceIndex });
    }

    return downsampledTargetIndex;
  }

  // @internal
  async function updateDataStreamTemplate(
    stream: string,
    mapping: Record<string, MappingProperty>,
    mode?: 'tsdb' | 'logsdb'
  ) {
    await es.cluster.putComponentTemplate({
      name: `${stream}_mapping`,
      template: {
        settings: !mode
          ? { mode: undefined }
          : mode === 'logsdb'
          ? { mode: 'logsdb' }
          : {
              mode: 'time_series',
              routing_path: 'request',
            },
        mappings: {
          properties: mapping,
        },
      },
    });
    // Uncomment only when needed
    // log.debug(`
    //   PUT _component_template/${stream}_mappings
    //   ${JSON.stringify({
    //     name: `${stream}_mapping`,
    //     template: {
    //       settings: !mode
    //         ? { mode: undefined }
    //         : mode === 'logsdb'
    //         ? { mode: 'logsdb' }
    //         : {
    //             mode: 'time_series',
    //             routing_path: 'request',
    //           },
    //       mappings: {
    //         properties: mapping,
    //       },
    //     },
    //   }, null, 2)}
    // `);
    log.info(`Updating ${stream} index template${mode ? ` for ${mode.toUpperCase()}` : ''}...`);
    await es.indices.putIndexTemplate({
      name: `${stream}_index_template`,
      index_patterns: [stream],
      data_stream: {},
      composed_of: [`${stream}_mapping`],
      _meta: {
        description: `Template for ${stream} testing index`,
      },
    });
    // Uncomment only when needed
    // log.verbose(`
    //   PUT _index_template/${stream}-index-template
    //   ${JSON.stringify({
    //     name: `${stream}_index_template`,
    //     index_patterns: [stream],
    //     data_stream: {},
    //     composed_of: [`${stream}_mapping`],
    //     _meta: {
    //       description: `Template for ${stream} testing index`,
    //     },
    //   }, null, 2)}
    // `);
  }

  /**
   * "Upgrade" a given data stream into a TSDB or LogsDB data series
   * @param stream the data stream name
   * @param newMapping the new mapping already with time series metrics/dimensions configured
   */
  async function upgradeStream(
    stream: string,
    newMapping: Record<string, MappingProperty>,
    mode: 'tsdb' | 'logsdb'
  ) {
    // rollover to upgrade the index type
    // uploading a new mapping for the stream index using the provided metric/dimension list
    log.info(`Updating ${stream} data stream component template with ${mode} stuff...`);
    await updateDataStreamTemplate(stream, newMapping, mode);

    log.info(`Rolling over the backing index for ${mode}`);
    await es.indices.rollover({
      alias: stream,
    });
    // Uncomment only when needed
    // log.verbose(`POST ${stream}/_rollover`);
  }

  /**
   * "Downgrade" a TSDB/TSDS/LogsDB data stream into a regular data stream
   * @param stream the TSDB/TSDS/LogsDB data stream to "downgrade"
   * @param oldMapping the new mapping already with time series metrics/dimensions already removed
   */
  async function downgradeStream(
    stream: string,
    newMapping: Record<string, MappingProperty>,
    mode: 'tsdb' | 'logsdb'
  ) {
    if (mode === 'tsdb') {
      // strip out any time-series specific mapping
      for (const fieldMapping of Object.values(newMapping || {})) {
        if ('time_series_metric' in fieldMapping) {
          delete fieldMapping.time_series_metric;
        }
        if ('time_series_dimension' in fieldMapping) {
          delete fieldMapping.time_series_dimension;
        }
      }
      log.info(`Updating ${stream} data stream component template with TSDB stuff...`);
      await updateDataStreamTemplate(stream, newMapping);
    }

    // rollover to downgrade the index type to regular stream
    log.info(`Rolling over the ${stream} data stream into a regular data stream...`);
    await es.indices.rollover({
      alias: stream,
    });
    // Uncomment only when needed
    // log.debug(`POST ${stream}/_rollover`);
  }

  /**
   * Takes care of the entire process to create a data stream
   * @param streamIndex name of the new data stream to create
   * @param mappings the mapping to associate with the data stream
   * @param tsdb when enabled it will configure the data stream as a TSDB/TSDS/LogsDB
   */
  async function createDataStream(
    streamIndex: string,
    mappings: Record<string, MappingProperty>,
    mode: 'tsdb' | 'logsdb' | undefined
  ) {
    log.info(`Creating ${streamIndex} data stream component template...`);

    await updateDataStreamTemplate(streamIndex, mappings, mode);

    try {
      log.info(`Creating ${streamIndex} data stream index...`);
      await es.indices.createDataStream({
        name: streamIndex,
      });
      // Uncomment only when needed
      // log.debug(`PUT _data_stream/${streamIndex}`);
    } catch (err) {
      // If this specific error is met, delete it and try again
      if (err.message.match(/resource_already_exists_exception/)) {
        log.info(`Found resource_already_exists_exception: delete and rety again...`);
        await deleteDataStream(streamIndex);
        await createDataStream(streamIndex, mappings, mode);
      }
    }
  }

  /**
   * Takes care of deleting a data stream and cleaning up everything associated to it
   * @param streamIndex name of the data stream
   */
  async function deleteDataStream(streamIndex: string) {
    log.info(`Delete ${streamIndex} data stream index...`);
    await es.indices.deleteDataStream({ name: streamIndex });
    // Uncomment only when needed
    // log.debug(`DELETE _data_stream/${streamIndex}`);
    log.info(`Delete ${streamIndex} index template...`);
    await es.indices.deleteIndexTemplate({
      name: `${streamIndex}_index_template`,
    });
    // Uncomment only when needed
    // log.debug(`DELETE _index_template/${streamIndex}-index-template`);
    log.info(`Delete ${streamIndex} data stream component template...`);
    await es.cluster.deleteComponentTemplate({
      name: `${streamIndex}_mapping`,
    });
    // Uncomment only when needed
    // log.debug(`DELETE _component_template/${streamIndex}_mappings`);
  }

  return {
    createDataStream,
    deleteDataStream,
    downsampleTSDBIndex,
    upgradeStream,
    downgradeStream,
  };
}
