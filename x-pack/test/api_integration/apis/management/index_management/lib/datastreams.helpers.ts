/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export function datastreamsHelpers(getService: FtrProviderContext['getService']) {
  const es = getService('es');

  const createDataStream = async (name: string, indexMode?: string) => {
    // A data stream requires an index template before it can be created.
    await es.indices.putIndexTemplate({
      name,
      body: {
        // We need to match the names of backing indices with this template.
        index_patterns: [name + '*'],
        template: {
          mappings: {
            properties: {
              '@timestamp': {
                type: 'date',
              },
            },
          },
          settings: {
            index: {
              mode: indexMode,
            },
          },
          lifecycle: {
            // @ts-expect-error @elastic/elasticsearch enabled prop is not typed yet
            enabled: true,
          },
        },
        data_stream: {},
      },
    });

    await es.indices.createDataStream({ name });
  };

  const updateIndexTemplateMappings = async (name: string, mappings: any) => {
    await es.indices.putIndexTemplate({
      name,
      body: {
        // We need to match the names of backing indices with this template.
        index_patterns: [name + '*'],
        template: {
          mappings,
        },
        data_stream: {},
      },
    });
  };

  const getDatastream = async (name: string) => {
    const {
      data_streams: [datastream],
    } = await es.indices.getDataStream({ name });
    return datastream;
  };

  const getMapping = async (name: string) => {
    const res = await es.indices.getMapping({ index: name });

    return Object.values(res)[0]!.mappings;
  };

  const deleteComposableIndexTemplate = async (name: string) => {
    await es.indices.deleteIndexTemplate({ name });
  };

  const deleteDataStream = async (name: string) => {
    await es.indices.deleteDataStream({ name });
    await deleteComposableIndexTemplate(name);
  };

  const assertDataStreamStorageSizeExists = (storageSize: string, storageSizeBytes: number) => {
    // Storage size of a document doesn't look like it would be deterministic (could vary depending
    // on how ES, Lucene, and the file system interact), so we'll just assert its presence and
    // type.
    expect(storageSize).to.be.ok();
    expect(typeof storageSize).to.be('string');
    expect(storageSizeBytes).to.be.ok();
    expect(typeof storageSizeBytes).to.be('number');
  };

  return {
    createDataStream,
    updateIndexTemplateMappings,
    getDatastream,
    getMapping,
    deleteComposableIndexTemplate,
    deleteDataStream,
    assertDataStreamStorageSizeExists,
  };
}
