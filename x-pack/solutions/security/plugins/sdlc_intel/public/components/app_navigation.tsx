/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHeaderLink, EuiHeaderLinks, EuiHeaderSectionItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import type { CoreStart } from '@kbn/core/public';
import {
  PLUGIN_ID,
  SDLC_EXECUTIVE_ROUTE,
  SDLC_PIPELINE_ROUTE,
  SDLC_TEAMS_ROUTE,
} from '../../common/constants';

const navItems = [
  {
    path: SDLC_EXECUTIVE_ROUTE,
    label: i18n.translate('xpack.sdlcIntel.nav.executive', {
      defaultMessage: 'Executive roadmap',
    }),
  },
  {
    path: SDLC_PIPELINE_ROUTE,
    label: i18n.translate('xpack.sdlcIntel.nav.pipeline', {
      defaultMessage: 'Phase pipeline',
    }),
  },
  {
    path: SDLC_TEAMS_ROUTE,
    label: i18n.translate('xpack.sdlcIntel.nav.teams', {
      defaultMessage: 'Team dimension',
    }),
  },
] as const;

export const AppNavigation = ({ coreStart }: { coreStart: CoreStart }) => (
  <EuiHeaderSectionItem>
    <RedirectAppLinks coreStart={coreStart}>
      <EuiHeaderLinks
        aria-label={i18n.translate('xpack.sdlcIntel.nav.ariaLabel', {
          defaultMessage: 'SDLC Intelligence navigation',
        })}
      >
        {navItems.map((item) => (
          <EuiHeaderLink
            key={item.path}
            href={`${coreStart.application.getUrlForApp(PLUGIN_ID)}${item.path}`}
          >
            {item.label}
          </EuiHeaderLink>
        ))}
      </EuiHeaderLinks>
    </RedirectAppLinks>
  </EuiHeaderSectionItem>
);

export const AppTitle = () => (
  <FormattedMessage id="xpack.sdlcIntel.appTitle" defaultMessage="SDLC Intelligence" />
);
