/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ChromeBreadcrumb } from '@kbn/core/public';

// No hrefs: the dashboard is the only route, and Chrome Next turns the last linked crumb into the
// header back button, so a link here would render a back button pointing at the current page.
export const UX_BREADCRUMBS: ChromeBreadcrumb[] = [
  {
    text: i18n.translate('xpack.ux.breadcrumbs.root', {
      defaultMessage: 'User Experience',
    }),
  },
  {
    text: i18n.translate('xpack.ux.breadcrumbs.dashboard', {
      defaultMessage: 'Overview',
    }),
  },
];
