/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PanelOpenerChildDefinition } from '@kbn/core-chrome-browser';
import { getNightshiftNavPanel } from './get_nightshift_nav_panel';

const prepend = (path: string) => `/base${path}`;

const findLink = (link: string): PanelOpenerChildDefinition | undefined =>
  (getNightshiftNavPanel().children ?? [])
    .flatMap((section) => section.children ?? [])
    .find((child) => child.link === link);

const isActiveAt = (link: string, path: string): boolean =>
  findLink(link)?.getIsActive?.({
    pathNameSerialized: `/base${path}`,
    prepend,
  } as Parameters<NonNullable<PanelOpenerChildDefinition['getIsActive']>>[0]) ?? false;

describe('getNightshiftNavPanel', () => {
  it('opens a panel with Home, then Automations, Detections and Knowledge', () => {
    const panel = getNightshiftNavPanel();

    expect(panel).toMatchObject({ id: 'nightshift', renderAs: 'panelOpener' });
    expect(panel.children?.map((section) => section.children?.map((child) => child.link))).toEqual([
      ['nightshift'],
      ['nightshift:automations', 'nightshift:detections', 'nightshift:knowledge'],
    ]);
  });

  it('marks Home active only on the Nightshift root page', () => {
    expect(isActiveAt('nightshift', '/app/nightshift')).toBe(true);
    expect(isActiveAt('nightshift', '/app/nightshift/')).toBe(true);
    expect(isActiveAt('nightshift', '/app/nightshift/automations')).toBe(false);
  });

  it('marks each section active on its own pages', () => {
    expect(isActiveAt('nightshift:automations', '/app/nightshift/automations/abc')).toBe(true);
    expect(isActiveAt('nightshift:detections', '/app/nightshift/detections/rules')).toBe(true);
    expect(isActiveAt('nightshift:detections', '/app/nightshift/sources')).toBe(true);
    expect(isActiveAt('nightshift:knowledge', '/app/nightshift/knowledge/memory')).toBe(true);
    expect(isActiveAt('nightshift:knowledge', '/app/nightshift/detections/events')).toBe(false);
  });
});
