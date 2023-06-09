/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export function createTSDBHelper({ getService }: Pick<FtrProviderContext, 'getService'>) {
  const es = getService('es');
  const log = getService('log');
  const indexPatterns = getService('indexPatterns');
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');

  async function loadIndex(index: string, archivePath: string) {
    log.info(`loading ${index} index...`);
    await esArchiver.loadIfNeeded(archivePath);
  }

  async function configureDataView(title: string, id?: string, archiveDataViewPath?: string) {
    log.info(`creating a data view for ${title}...`);
    // if a path is provided load from there, or create it
    if (archiveDataViewPath) {
      await kibanaServer.importExport.load(archiveDataViewPath);
    } else {
      indexPatterns.create(
        {
          title,
          timeFieldName: '@timestamp',
        },
        { override: true }
      );
    }
    if (id) {
      log.info(`setting the ${title} dataView as default...`);
      await kibanaServer.uiSettings.replace({
        defaultIndex: id,
      });
    }
  }

  async function unloadTSDBDataView(
    index: string,
    archivePath: string,
    archiveDataViewPath: string
  ) {
    log.info(`removing ${index} index...`);
    await esArchiver.unload(archivePath);
    log.info(`removing the TSDB dataView...`);
    await kibanaServer.importExport.unload(archiveDataViewPath);
    log.info(`unsetting the TSDB dataView default...`);
    await kibanaServer.uiSettings.unset('defaultIndex');
  }

  async function downsampleTSDBIndex(index: string) {
    const downsampled = {
      index: `${index}-downsampled`,
      dataView: `${index},${index}-downsampled`,
    };
    // await loadIndex(source.index, source.archivePath);

    log.info(`add write block to ${index} index...`);
    await es.indices.addBlock({ index, block: 'write' });
    try {
      log.info(`rolling up ${index} index...`);
      // es client currently does not have method for downsample
      await es.transport.request<void>({
        method: 'POST',
        path: `/${index}/_downsample/${downsampled.index}`,
        body: { fixed_interval: '1h' },
      });
    } catch (err) {
      log.info(`ignoring resource_already_exists_exception...`);
      if (!err.message.match(/resource_already_exists_exception/)) {
        throw err;
      }
    }

    return downsampled;
  }

  async function deleteIndexAndResetSettings(index: string) {
    await kibanaServer.savedObjects.cleanStandardList();
    await kibanaServer.uiSettings.replace({});
    await es.indices.delete({ index: [index] });
  }

  return {
    loadIndex,
    configureDataView,
    unloadTSDBDataView,
    downsampleTSDBIndex,
    deleteIndexAndResetSettings,
  };
}
