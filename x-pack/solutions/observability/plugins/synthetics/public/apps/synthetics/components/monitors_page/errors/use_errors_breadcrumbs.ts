/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useLocation } from 'react-router-dom';
import { useBreadcrumbs } from '../../../hooks/use_breadcrumbs';
import { PLUGIN } from '../../../../../../common/constants/plugin';

export const useErrorsBreadcrumbs = () => {
  const kibana = useKibana();
  const { search } = useLocation();
  const appPath = kibana.services.application?.getUrlForApp(PLUGIN.SYNTHETICS_PLUGIN_ID) ?? '';

  // Append the current `search` so that clicking the breadcrumb after applying
  // filters / changing the date range does not drop those URL params.
  const crumbs = useMemo(
    () => [
      {
        text: ERRORS_PAGE_CRUMB,
        href: `${appPath}/errors${search}`,
      },
    ],
    [appPath, search]
  );

  useBreadcrumbs(crumbs);
};

export const ERRORS_PAGE_CRUMB = i18n.translate('xpack.synthetics.overviewPage.errorsCrumb', {
  defaultMessage: 'Errors',
});
