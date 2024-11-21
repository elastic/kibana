/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  FieldRetentionOperator,
  fieldOperatorToIngestProcessor,
} from '@kbn/security-solution-plugin/server/lib/entity_analytics/entity_store/field_retention_definition';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { applyIngestProcessorToDoc } from '../utils/ingest';
export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const log = getService('log');

  const expectArraysMatchAnyOrder = (a: any[], b: any[]) => {
    const aSorted = a.sort();
    const bSorted = b.sort();
    expect(aSorted).to.eql(bSorted);
  };

  const applyOperatorToDoc = async (
    operator: FieldRetentionOperator,
    docSource: any
  ): Promise<any> => {
    const step = fieldOperatorToIngestProcessor(operator, { enrichField: 'historical' });

    return applyIngestProcessorToDoc([step], docSource, es, log);
  };

  describe('@ess @serverless @skipInServerlessMKI Entity store - Field Retention Pipeline Steps', () => {
    describe('collect_values operator', () => {
      it('should return value if no history', async () => {
        const op: FieldRetentionOperator = {
          operation: 'collect_values',
          field: 'test_field',
          maxLength: 10,
        };

        const doc = {
          test_field: ['foo'],
        };

        const resultDoc = await applyOperatorToDoc(op, doc);

        expectArraysMatchAnyOrder(resultDoc.test_field, ['foo']);
      });

      it('should not take from history if latest field has maxLength values', async () => {
        const op: FieldRetentionOperator = {
          operation: 'collect_values',
          field: 'test_field',
          maxLength: 1,
        };

        const doc = {
          test_field: ['foo'],
          historical: {
            test_field: ['bar', 'baz'],
          },
        };

        const resultDoc = await applyOperatorToDoc(op, doc);

        expectArraysMatchAnyOrder(resultDoc.test_field, ['foo']);
      });

      it("should take from history if latest field doesn't have maxLength values", async () => {
        const op: FieldRetentionOperator = {
          operation: 'collect_values',
          field: 'test_field',
          maxLength: 10,
        };

        const doc = {
          test_field: ['foo'],
          historical: {
            test_field: ['bar', 'baz'],
          },
        };

        const resultDoc = await applyOperatorToDoc(op, doc);

        expectArraysMatchAnyOrder(resultDoc.test_field, ['foo', 'bar', 'baz']);
      });

      it('should only take from history up to maxLength values', async () => {
        const op: FieldRetentionOperator = {
          operation: 'collect_values',
          field: 'test_field',
          maxLength: 2,
        };

        const doc = {
          test_field: ['foo'],
          historical: {
            test_field: ['bar', 'baz'],
          },
        };

        const resultDoc = await applyOperatorToDoc(op, doc);

        expectArraysMatchAnyOrder(resultDoc.test_field, ['foo', 'bar']);
      });

      it('should handle value not being an array', async () => {
        const op: FieldRetentionOperator = {
          operation: 'collect_values',
          field: 'test_field',
          maxLength: 2,
        };
        const doc = {
          test_field: 'foo',
          historical: {
            test_field: ['bar'],
          },
        };

        const resultDoc = await applyOperatorToDoc(op, doc);

        expectArraysMatchAnyOrder(resultDoc.test_field, ['foo', 'bar']);
      });

      it('should handle missing values', async () => {
        const op: FieldRetentionOperator = {
          operation: 'collect_values',
          field: 'test_field',
          maxLength: 2,
        };
        const doc = {};

        const resultDoc = await applyOperatorToDoc(op, doc);

        expectArraysMatchAnyOrder(resultDoc.test_field, []);
      });
    });
    describe('prefer_newest_value operator', () => {
      it('should return latest value if no history value', async () => {
        const op: FieldRetentionOperator = {
          operation: 'prefer_newest_value',
          field: 'test_field',
        };

        const doc = {
          test_field: 'latest',
        };

        const resultDoc = await applyOperatorToDoc(op, doc);

        expect(resultDoc.test_field).to.eql('latest');
      });
      it('should return history value if no latest value (undefined)', async () => {
        const op: FieldRetentionOperator = {
          operation: 'prefer_newest_value',
          field: 'test_field',
        };

        const doc = {
          historical: {
            test_field: 'historical',
          },
        };

        const resultDoc = await applyOperatorToDoc(op, doc);

        expect(resultDoc.test_field).to.eql('historical');
      });
      it('should return history value if no latest value (empty string)', async () => {
        const op: FieldRetentionOperator = {
          operation: 'prefer_newest_value',
          field: 'test_field',
        };

        const doc = {
          test_field: '',
          historical: {
            test_field: 'historical',
          },
        };

        const resultDoc = await applyOperatorToDoc(op, doc);

        expect(resultDoc.test_field).to.eql('historical');
      });
      it('should return history value if no latest value (empty array)', async () => {
        const op: FieldRetentionOperator = {
          operation: 'prefer_newest_value',
          field: 'test_field',
        };

        const doc = {
          test_field: [],
          historical: {
            test_field: 'historical',
          },
        };

        const resultDoc = await applyOperatorToDoc(op, doc);

        expect(resultDoc.test_field).to.eql('historical');
      });
      it('should return history value if no latest value (empty object)', async () => {
        const op: FieldRetentionOperator = {
          operation: 'prefer_newest_value',
          field: 'test_field',
        };

        const doc = {
          test_field: {},
          historical: {
            test_field: 'historical',
          },
        };

        const resultDoc = await applyOperatorToDoc(op, doc);

        expect(resultDoc.test_field).to.eql('historical');
      });
      it('should return latest value if both latest and history values', async () => {
        const op: FieldRetentionOperator = {
          operation: 'prefer_newest_value',
          field: 'test_field',
        };

        const doc = {
          test_field: 'latest',
          historical: {
            test_field: 'historical',
          },
        };

        const resultDoc = await applyOperatorToDoc(op, doc);

        expect(resultDoc.test_field).to.eql('latest');
      });

      it('should handle missing values', async () => {
        const op: FieldRetentionOperator = {
          operation: 'prefer_newest_value',
          field: 'test_field',
        };
        const doc = {};

        const resultDoc = await applyOperatorToDoc(op, doc);

        expect(resultDoc.test_field).to.eql(undefined);
      });
    });
    describe('prefer_oldest_value operator', () => {
      it('should return history value if no latest value', async () => {
        const op: FieldRetentionOperator = {
          operation: 'prefer_oldest_value',
          field: 'test_field',
        };

        const doc = {
          historical: {
            test_field: 'historical',
          },
        };

        const resultDoc = await applyOperatorToDoc(op, doc);

        expect(resultDoc.test_field).to.eql('historical');
      });
      it('should return latest value if no history value (undefined)', async () => {
        const op: FieldRetentionOperator = {
          operation: 'prefer_oldest_value',
          field: 'test_field',
        };

        const doc = {
          test_field: 'latest',
          historical: {
            test_field: undefined,
          },
        };

        const resultDoc = await applyOperatorToDoc(op, doc);

        expect(resultDoc.test_field).to.eql('latest');
      });
      it('should return latest value if no history value (empty string)', async () => {
        const op: FieldRetentionOperator = {
          operation: 'prefer_oldest_value',
          field: 'test_field',
        };

        const doc = {
          test_field: 'latest',
          historical: {
            test_field: '',
          },
        };

        const resultDoc = await applyOperatorToDoc(op, doc);

        expect(resultDoc.test_field).to.eql('latest');
      });
      it('should return latest value if no history value (empty array)', async () => {
        const op: FieldRetentionOperator = {
          operation: 'prefer_oldest_value',
          field: 'test_field',
        };

        const doc = {
          test_field: 'latest',
          historical: {
            test_field: [],
          },
        };

        const resultDoc = await applyOperatorToDoc(op, doc);

        expect(resultDoc.test_field).to.eql('latest');
      });
      it('should return latest value if no history value (empty object)', async () => {
        const op: FieldRetentionOperator = {
          operation: 'prefer_oldest_value',
          field: 'test_field',
        };

        const doc = {
          test_field: 'latest',
          historical: {
            test_field: {},
          },
        };

        const resultDoc = await applyOperatorToDoc(op, doc);

        expect(resultDoc.test_field).to.eql('latest');
      });
      it('should return history value if both latest and history values', async () => {
        const op: FieldRetentionOperator = {
          operation: 'prefer_oldest_value',
          field: 'test_field',
        };

        const doc = {
          test_field: 'latest',
          historical: {
            test_field: 'historical',
          },
        };

        const resultDoc = await applyOperatorToDoc(op, doc);

        expect(resultDoc.test_field).to.eql('historical');
      });
    });
  });
};
