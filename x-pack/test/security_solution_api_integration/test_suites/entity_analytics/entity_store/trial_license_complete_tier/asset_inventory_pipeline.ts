/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { entityMetadataExtractorProcessor } from '@kbn/security-solution-plugin/server/lib/entity_analytics/entity_store/entity_definitions/entity_descriptions/universal';
import { dynamicNewestRetentionSteps } from '@kbn/security-solution-plugin/server/lib/entity_analytics/entity_store/field_retention/dynamic_retention';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { applyIngestProcessorToDoc } from '../utils/ingest';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const log = getService('log');
  describe('@ess @serverless @skipInServerlessMKI Asset Inventory - universal entity engine pipeline ', () => {
    describe('Entity metadata extractor processor step', () => {
      it('should extract metadata from "collected.metadata" and add it to the document', async () => {
        const metadata = {
          test: {
            cloud: { super: 123 },
            okta: { foo: { baz: { qux: 1 } } },
          },
        };
        const doc = {
          collected: {
            metadata: [JSON.stringify(metadata)],
          },
          entity: {
            id: 'test',
          },
        };

        const result = await applyIngestProcessorToDoc(
          [entityMetadataExtractorProcessor],
          doc,
          es,
          log
        );

        const processed = {
          ...doc,
          ...metadata.test,
        };

        return expect(result).to.eql(processed);
      });
    });

    describe('prefer newest value for dynamic entities', () => {
      it('should return latest value if no history value', async () => {
        const metadata = {
          cloud: { super: 123 },
        };

        const doc = metadata;

        const processor = dynamicNewestRetentionSteps([]);
        const result = await applyIngestProcessorToDoc([processor], doc, es, log);

        return expect(result).to.eql(doc);
      });

      it('should return history value if no latest value is found', async () => {
        const metadata = {
          cloud: { super: 123 },
        };

        const doc = {
          historical: metadata,
        };

        const processor = dynamicNewestRetentionSteps([]);
        const result = await applyIngestProcessorToDoc([processor], doc, es, log);

        return expect(result).to.eql({
          ...doc,
          ...metadata,
        });
      });

      it('should return latest value if both historical and latest values exist', async () => {
        const metadata = {
          cloud: { super: 123 },
        };

        const historical = {
          cloud: { super: 456 },
        };

        const doc = {
          historical,
          ...metadata,
        };

        const processor = dynamicNewestRetentionSteps([]);
        const result = await applyIngestProcessorToDoc([processor], doc, es, log);

        return expect(result).to.eql(doc);
      });

      it('should merge nested object preserving historical values not found in latest', async () => {
        const metadata = {
          cloud: { host: 'test' },
          okta: { foo: { bar: { baz: 1 } } },
        };

        const historical = {
          cloud: { user: 'agent' },
          okta: { foo: { bar: { qux: 11 } } },
        };

        const doc = {
          historical,
          ...metadata,
        };

        const processor = dynamicNewestRetentionSteps([]);
        const result = await applyIngestProcessorToDoc([processor], doc, es, log);

        return expect(result).to.eql({
          historical,
          cloud: { host: 'test', user: 'agent' },
          okta: { foo: { bar: { baz: 1, qux: 11 } } },
        });
      });

      it('should ignore historical static fields', async () => {
        const metadata = {
          cloud: { host: 'test' },
        };

        const historical = {
          static: 'static',
          cloud: { user: 'agent' },
          okta: { foo: { bar: { qux: 1 } } },
        };

        const doc = {
          historical,
          ...metadata,
        };

        const staticFields = ['static'];
        const processor = dynamicNewestRetentionSteps(staticFields);
        const result = await applyIngestProcessorToDoc([processor], doc, es, log);

        return expect(result).to.eql({
          historical,
          cloud: { host: 'test', user: 'agent' },
          okta: { foo: { bar: { qux: 1 } } },
        });
      });
    });
  });
};
