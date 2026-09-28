/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout-oblt';

type ConsumerVisibilitySolution = 'stack' | 'observability';

const buildPanelsJson = (solution: ConsumerVisibilitySolution, tag: string, title: string) =>
  JSON.stringify([
    {
      version: '9.5.0',
      type: 'alerts_table',
      gridData: { x: 0, y: 0, w: 48, h: 20, i: 'p1' },
      panelIndex: 'p1',
      embeddableConfig: {
        tableConfig: {
          solution,
          query: {
            type: 'alertsFilters',
            filters: [{ filter: { type: 'ruleTags', value: [tag] } }],
          },
        },
      },
      title,
    },
  ]);

export const createConsumerVisibilityDashboard = async (
  kbnClient: KbnClient,
  {
    solution,
    tag,
    title = 'Consumer visibility',
  }: {
    solution: ConsumerVisibilitySolution;
    tag: string;
    title?: string;
  }
): Promise<string> => {
  const dashboard = await kbnClient.savedObjects.create({
    type: 'dashboard',
    overwrite: false,
    attributes: {
      title: `${title} - ${tag}`,
      description: '',
      panelsJSON: buildPanelsJson(solution, tag, title),
      optionsJSON:
        '{"useMargins":true,"syncColors":false,"syncCursor":true,"syncTooltips":false,"hidePanelTitles":false}',
      timeRestore: true,
      timeFrom: 'now-24h',
      timeTo: 'now',
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{"query":{"query":"","language":"kuery"},"filter":[]}',
      },
    },
  });

  return dashboard.id;
};

export const deleteConsumerVisibilityDashboard = async (
  kbnClient: KbnClient,
  dashboardId: string
): Promise<void> => {
  await kbnClient.savedObjects
    .delete({
      type: 'dashboard',
      id: dashboardId,
    })
    .catch(() => {});
};
