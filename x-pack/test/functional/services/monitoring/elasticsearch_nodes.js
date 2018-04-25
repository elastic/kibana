/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function MonitoringElasticsearchNodesProvider({ getService/*, getPageObjects */ }) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  const SUBJ_LISTING_PAGE = 'elasticsearchNodesListingPage';
  const SUBJ_TABLE_BODY = 'nodesTableBody';
  const SUBJ_NODE_LINK_PREFIX = `${SUBJ_TABLE_BODY} nodeLink-`;

  return new class ElasticsearchIndices {
    async isOnListing() {
      const pageId = await retry.try(() => testSubjects.find(SUBJ_LISTING_PAGE));
      return pageId !== null;
    }

    clickRowByResolver(nodeResolver) {
      return testSubjects.click(SUBJ_NODE_LINK_PREFIX + nodeResolver);
    }

  };
}
