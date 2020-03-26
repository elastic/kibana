/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function LogstashPageProvider({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['common']);
  const pipelineList = getService('pipelineList');
  const pipelineEditor = getService('pipelineEditor');

  return new (class LogstashPage {
    async gotoPipelineList() {
      await PageObjects.common.navigateToApp('logstashPipelines');
      await pipelineList.assertExists();
    }

    async gotoNewPipelineEditor() {
      await this.gotoPipelineList();
      await pipelineList.clickAdd();
      await pipelineEditor.assertExists();
    }
  })();
}
