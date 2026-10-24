/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { serializedTitlesSchema } from '@kbn/presentation-publishing-schemas';

const optionalFilter = (description: string) =>
  z.string().max(1024).optional().meta({ description });

const UxOverviewPanelCustomSchema = z
  .object({
    panel: z
      .enum([
        'cover',
        'kpis',
        'vitals',
        'trends',
        'frustration',
        'browsers',
        'countries',
        'pages',
        'sessions',
        'funnels',
        'budgets',
        'alerts',
      ])
      .meta({
        description: 'Which User Experience widget this panel renders',
      }),
    service_name: optionalFilter('Application name from the UX inventory'),
    range_from: z.string().max(128).meta({
      description: 'Start of the captured time range when the dashboard time picker is unavailable',
    }),
    range_to: z.string().max(128).meta({
      description: 'End of the captured time range when the dashboard time picker is unavailable',
    }),
    kuery: z.string().max(4096).optional().meta({
      description: 'KQL from the Overview filter bar',
    }),
    browser: optionalFilter('Browser filter'),
    os: optionalFilter('OS filter'),
    location: optionalFilter('Country ISO filter'),
    page_url: optionalFilter('Page path filter'),
    frustration: optionalFilter('Frustration kind filter'),
    user: optionalFilter('Identified user filter'),
    include_bots: optionalFilter('Include-bots flag'),
    bot_ua: optionalFilter('Bot user-agent filter'),
    breakpoint: optionalFilter('Viewport breakpoint filter'),
    connection: optionalFilter('Connection type filter'),
    device: optionalFilter('Device type filter'),
    analytics_mode: optionalFilter('Analytics mode'),
  })
  .strict();

export const getUxOverviewPanelEmbeddableSchema = () =>
  z
    .object({
      ...UxOverviewPanelCustomSchema.shape,
      ...serializedTitlesSchema.shape,
    })
    .strict()
    .meta({
      id: 'ux-overview-panel-embeddable',
      description: 'User Experience Overview panel embeddable',
    });

export type UxOverviewPanelEmbeddableState = z.output<
  ReturnType<typeof getUxOverviewPanelEmbeddableSchema>
>;
