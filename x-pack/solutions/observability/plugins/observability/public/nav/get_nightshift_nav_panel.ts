/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PanelOpenerChildDefinition, RootNodeDefinition } from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';
import { NightshiftNavigationIcon } from '@kbn/observability-shared-plugin/public';

const NIGHTSHIFT_PATH = '/app/nightshift';

const startsWithNightshiftPath =
  (...subPaths: string[]): NonNullable<PanelOpenerChildDefinition['getIsActive']> =>
  ({ pathNameSerialized, prepend }) =>
    subPaths.some((subPath) =>
      pathNameSerialized.startsWith(prepend(`${NIGHTSHIFT_PATH}${subPath}`))
    );

// The app link matches every Nightshift URL by default, so Home only owns the root page.
const getHomeIsActive: NonNullable<PanelOpenerChildDefinition['getIsActive']> = ({
  pathNameSerialized,
  prepend,
}) =>
  pathNameSerialized === prepend(NIGHTSHIFT_PATH) ||
  pathNameSerialized === prepend(`${NIGHTSHIFT_PATH}/`);

/** Nightshift side nav entry: a panel with Home, then Investigations, Automations, Detections and Knowledge. */
export const getNightshiftNavPanel = (): RootNodeDefinition => ({
  id: 'nightshift',
  title: i18n.translate('xpack.observability.nav.nightshift', {
    defaultMessage: 'Elastic nightshift',
  }),
  // Parent `link` is the icon's landing page — always Nightshift Home, not the last
  // opened section. Visibility still follows the Nightshift app deep link.
  link: 'nightshift',
  icon: NightshiftNavigationIcon,
  renderAs: 'panelOpener',
  getIsActive: startsWithNightshiftPath(''),
  children: [
    {
      id: 'nightshift_home',
      breadcrumbStatus: 'hidden',
      children: [
        {
          link: 'nightshift',
          title: i18n.translate('xpack.observability.nav.nightshift.home', {
            defaultMessage: 'Home',
          }),
          getIsActive: getHomeIsActive,
        },
      ],
    },
    {
      id: 'nightshift_sections',
      breadcrumbStatus: 'hidden',
      children: [
        {
          link: 'nightshift:investigations',
          getIsActive: startsWithNightshiftPath('/investigations'),
        },
        {
          link: 'nightshift:automations',
          getIsActive: startsWithNightshiftPath('/automations'),
        },
        {
          link: 'nightshift:detections',
          getIsActive: startsWithNightshiftPath('/detections', '/sources'),
        },
        {
          link: 'nightshift:knowledge',
          getIsActive: startsWithNightshiftPath('/knowledge'),
        },
      ],
    },
  ],
});
