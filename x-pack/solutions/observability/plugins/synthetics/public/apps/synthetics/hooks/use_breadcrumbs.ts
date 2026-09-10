/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChromeBreadcrumb } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import type { EuiBreadcrumb } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useBreadcrumbs as useObservabilityBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import type { ClientPluginsStart } from '../../../plugin';
import type { SyntheticsUrlParams } from '../utils/url_params';
import { stringifyUrlParams } from '../utils/url_params';
import { useUrlParams } from './use_url_params';
import { OVERVIEW_ROUTE } from '../../../../common/constants';
import { PLUGIN } from '../../../../common/constants/plugin';

const EMPTY_QUERY = '?';

export const makeBaseBreadcrumb = (
  uptimePath: string,
  params?: SyntheticsUrlParams,
  options?: { isRootRoute?: boolean }
): EuiBreadcrumb[] => {
  if (params) {
    const crumbParams: Partial<SyntheticsUrlParams> = { ...params };

    delete crumbParams.statusFilter;
    const query = stringifyUrlParams(crumbParams, true);
    uptimePath += query === EMPTY_QUERY ? '' : query;
  }

  const baseBreadcrumbs: EuiBreadcrumb[] = [];

  baseBreadcrumbs.push({
    text: i18n.translate('xpack.synthetics.breadcrumbs.overviewBreadcrumbText', {
      defaultMessage: 'Synthetics',
    }),
    // A clickable crumb on the root turns into a back button pointing at the current page.
    ...(options?.isRootRoute ? {} : { href: uptimePath }),
    'data-test-subj': 'syntheticsPathBreadcrumb',
  });

  return baseBreadcrumbs;
};

export const useBreadcrumbs = (extraCrumbs: ChromeBreadcrumb[]) => {
  const params = useUrlParams()[0]();
  const { pathname } = useLocation();
  const kibana = useKibana<ClientPluginsStart>();
  const syntheticsPath =
    kibana.services.application?.getUrlForApp(PLUGIN.SYNTHETICS_PLUGIN_ID) ?? '';
  // The scoped history reports the app root as '/' or '', depending on how the URL was entered.
  const isRootRoute = pathname === OVERVIEW_ROUTE || pathname === '';
  const breadcrumbs = useMemo(() => {
    return makeBaseBreadcrumb(syntheticsPath, params, { isRootRoute }).concat(extraCrumbs);
  }, [extraCrumbs, isRootRoute, params, syntheticsPath]);

  useObservabilityBreadcrumbs(breadcrumbs, { serverless: kibana.services.serverless });
};
