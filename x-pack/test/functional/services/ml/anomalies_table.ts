/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningAnomaliesTableProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return {
    async assertTableExists() {
      await testSubjects.existOrFail('mlAnomaliesTable');
    },

    async assertTableNotEmpty() {
      const tableRows = await testSubjects.findAll('mlAnomaliesTable > ~mlAnomaliesListRow');
      expect(tableRows.length).to.be.greaterThan(
        0,
        `Anomalies table should have at least one row (got '${tableRows.length}')`
      );
    },
  };
}
