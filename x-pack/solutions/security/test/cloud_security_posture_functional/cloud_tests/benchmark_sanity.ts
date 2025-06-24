/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'benchmark']);

  describe('Benchmark Page - Sanity Tests', function () {
    this.tags(['cloud_security_posture_ui_sanity']);
    let benchmark: typeof pageObjects.benchmark;

    before(async () => {
      benchmark = pageObjects.benchmark;
      await benchmark.navigateToBenchnmarkPage();
      await benchmark.waitForPluginInitialized();
    });

    it('Benchmark table exists', async () => {
      expect(await benchmark.benchmarkPage.doesBenchmarkTableExists());
    });

    it('Benchmarks count is more than 0', async () => {
      const benchmarksRows = await benchmark.benchmarkPage.getBenchmarkTableRows();
      expect(benchmarksRows.length).to.be.greaterThan(0);
    });

    it('For each benchmark, evaluation and complience are not empty', async () => {
      const benchmarksRows = await benchmark.benchmarkPage.getBenchmarkTableRows();
      for (const row of benchmarksRows) {
        const benchmarkName = await benchmark.benchmarkPage.getCisNameCellData(row);
        const isEvaluationEmpty = await benchmark.benchmarkPage.isEvaluationEmpty(row);
        const isComplianceEmpty = await benchmark.benchmarkPage.isComplianceEmpty(row);

        expect(isEvaluationEmpty).to.eql(
          false,
          `The ${benchmarkName} does not have evaluated data`
        );

        expect(isComplianceEmpty).to.eql(
          false,
          `The ${benchmarkName} does not have compliance data`
        );
      }
    });
  });
};
