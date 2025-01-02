/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function MonitoringLogstashPipelineViewerProvider({ getService }) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const find = getService('find');

  const SUBJ_PIPELINE_SECTION_PREFIX = 'pipelineViewerSection_';

  return new (class LogstashPipelineViewer {
    isOnPipelineViewer() {
      return retry.try(() => find.byCssSelector('[data-test-subj*="pipeline-viewer"]'));
    }

    async getPipelineDefinition() {
      const getSectionItems = async () => {
        const items = await find.allByCssSelector('[data-test-subj*="pipeline-viewer-list-item"]');

        return Promise.all(
          items.map(async (item) => {
            const [name, ...metrics] = await item.getVisibleText().then((text) => text.split('\n'));
            return { name, metrics };
          })
        );
      };

      const [inputs, filters, outputs] = await Promise.all([
        testSubjects.find(SUBJ_PIPELINE_SECTION_PREFIX + 'Inputs').then(getSectionItems),
        testSubjects.find(SUBJ_PIPELINE_SECTION_PREFIX + 'Filters').then(getSectionItems),
        testSubjects.find(SUBJ_PIPELINE_SECTION_PREFIX + 'Outputs').then(getSectionItems),
      ]);

      return { inputs, filters, outputs };
    }
  })();
}
