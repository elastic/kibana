/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { buildIngestPipeline } from '@kbn/asset-inventory-plugin/server/lib/ingest_pipelines';
import { applyIngestProcessorToDoc } from './utils/ingest';
import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const log = getService('log');

  const applyOperatorToDoc = async (docSource: any): Promise<any> => {
    const steps = buildIngestPipeline();

    return applyIngestProcessorToDoc(steps, docSource, es, log);
  };

  describe('Asset Inventory - Entity store - Keyword builder pipeline', () => {
    it('should build entities.keyword when entities.metadata is provided ', async () => {
      const doc = {
        related: {
          entity: ['entity-id-1', 'entity-id-2', 'entity-id-3'],
        },
        entities: {
          metadata: {
            'entity-id-1': {
              entity: {
                type: 'SomeType',
              },
              cloud: {
                region: 'us-east-1',
              },
              someECSfield: 'someECSfieldValue',
              SomeNonECSField: 'SomeNonECSValue',
            },
            'entity-id-2': {
              entity: {
                type: 'SomeOtherType',
              },
              SomeNonECSField: 'SomeNonECSValue',
            },
            'entity-id-3': {
              someECSfield: 'someECSfieldValue',
            },
          },
        },
      };

      const resultDoc = await applyOperatorToDoc(doc);

      expect(resultDoc.entities.keyword).to.eql([
        '{"entity-id-3":{"someECSfield":"someECSfieldValue"}}',
        '{"entity-id-2":{"SomeNonECSField":"SomeNonECSValue","entity":{"type":"SomeOtherType"}}}',
        '{"entity-id-1":{"cloud":{"region":"us-east-1"},"SomeNonECSField":"SomeNonECSValue","someECSfield":"someECSfieldValue","entity":{"type":"SomeType"}}}',
      ]);
    });
  });
};
