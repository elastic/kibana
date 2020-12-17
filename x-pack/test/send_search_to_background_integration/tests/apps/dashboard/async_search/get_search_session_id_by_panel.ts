/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// HELPERS
export function getSearchSessionIdByPanelProvider(getService: any) {
  const dashboardPanelActions = getService('dashboardPanelActions');
  const inspector = getService('inspector');
  const testSubjects = getService('testSubjects');

  return async function getSearchSessionIdByPanel(panelTitle: string) {
    await dashboardPanelActions.openInspectorByTitle(panelTitle);
    await inspector.openInspectorRequestsView();
    const searchSessionId = await (
      await testSubjects.find('inspectorRequestSearchSessionId')
    ).getAttribute('data-search-session-id');
    await inspector.close();
    return searchSessionId;
  };
}
