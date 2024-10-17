/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { removeFieldByValueSteps } from '@kbn/security-solution-plugin/server/lib/entity_analytics/entity_store/elasticsearch_assets/ingest_processor_steps';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { applyIngestProcessorToDoc } from '../utils/ingest';
export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const log = getService('log');

  describe('@ess @serverless @skipInServerlessMKI Entity store - Ingest Processor Steps', () => {
    describe('removeFieldByValueSteps operator', () => {
      it('should return empty doc if all fields are removed', async () => {
        const doc = {
          test_field_1: 1,
          test_field_2: '2',
        };

        const steps = removeFieldByValueSteps([
          { field: 'test_field_1', value: 1 },
          { field: 'test_field_2', value: '2' },
        ]);
        const resultDoc = await applyIngestProcessorToDoc(steps, doc, es, log);

        expect(resultDoc).to.eql({});
      });

      it('should not change doc if field value not found', async () => {
        const doc = {
          test_field: 1,
        };

        const steps = removeFieldByValueSteps([{ field: 'test_field', value: 2 }]);
        const resultDoc = await applyIngestProcessorToDoc(steps, doc, es, log);

        expect(resultDoc).to.eql(doc);
      });
    });
  });
};
