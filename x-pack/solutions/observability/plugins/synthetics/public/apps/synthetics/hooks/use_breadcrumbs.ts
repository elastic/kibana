/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChromeBreadcrumb } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useMemo } from 'react';
import { EuiBreadcrumb } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useBreadcrumbs as useObservabilityBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { ClientPluginsStart } from '../../../plugin';
import { SyntheticsUrlParams, stringifyUrlParams } from '../utils/url_params';
import { useUrlParams } from './use_url_params';
import { PLUGIN } from '../../../../common/constants/plugin';

const EMPTY_QUERY = '?';

export const makeBaseBreadcrumb = (
  uptimePath: string,
  params?: SyntheticsUrlParams
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
    href: uptimePath,
    'data-test-subj': 'syntheticsPathBreadcrumb',
  });

  return baseBreadcrumbs;
};

export const useBreadcrumbs = (extraCrumbs: ChromeBreadcrumb[]) => {
  const params = useUrlParams()[0]();
  const kibana = useKibana<ClientPluginsStart>();
  const syntheticsPath =
    kibana.services.application?.getUrlForApp(PLUGIN.SYNTHETICS_PLUGIN_ID) ?? '';
  const breadcrumbs = useMemo(() => {
    return makeBaseBreadcrumb(syntheticsPath, params).concat(extraCrumbs);
  }, [extraCrumbs, params, syntheticsPath]);

  useObservabilityBreadcrumbs(breadcrumbs, { serverless: kibana.services.serverless });
};
