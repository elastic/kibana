/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { AppMenuConfig, AppMenuItemType } from '@kbn/core-chrome-app-menu-components';
import { RECORDS_FIELD, createExploratoryViewUrl } from '@kbn/exploratory-view-plugin/public';
import { useInspectorContext } from '@kbn/observability-shared-plugin/public';
import { useLegacyUrlParams } from '../context/url_params_context/use_url_params';
import { SERVICE_NAME } from '../../common/elasticsearch_fieldnames';
import { useKibanaServices } from './use_kibana_services';

const ANALYZE_DATA = i18n.translate('xpack.ux.analyzeDataButtonLabel', {
  defaultMessage: 'Explore data',
});

const ANALYZE_MESSAGE = i18n.translate('xpack.ux.analyzeDataButtonLabel.message', {
  defaultMessage:
    'Go to Explore Data, where you can select and filter result data in any dimension and look for the cause or impact of performance problems.',
});

export function useAppMenu(enableInspector: boolean) {
  const { application, http, inspector } = useKibanaServices();
  const { urlParams } = useLegacyUrlParams();
  const { inspectorAdapters } = useInspectorContext();
  const { rangeTo, rangeFrom, serviceName } = urlParams;

  const appMenu = useMemo<AppMenuConfig>(() => {
    const uxExploratoryViewLink = createExploratoryViewUrl(
      {
        reportType: 'kpi-over-time',
        allSeries: [
          {
            dataType: 'ux',
            name: `${serviceName}-page-views`,
            time: { from: rangeFrom!, to: rangeTo! },
            reportDefinitions: {
              [SERVICE_NAME]: serviceName ? [serviceName] : [],
            },
            selectedMetricField: RECORDS_FIELD,
          },
        ],
      },
      http.basePath.get()
    );

    const items = [
      {
        id: 'addData',
        label: i18n.translate('xpack.ux.addDataButtonLabel', {
          defaultMessage: 'Add data',
        }),
        href: application.getUrlForApp('/apm/tutorial'),
        iconType: 'plus',
      },
    ] as AppMenuItemType[];

    if (enableInspector) {
      items.unshift({
        id: 'inspect',
        label: i18n.translate('xpack.ux.inspectButtonText', {
          defaultMessage: 'Inspect',
        }),
        iconType: 'inspect',
        run: () => inspector.open(inspectorAdapters),
        overflow: true,
      });
    }

    return {
      primaryActionItem: {
        id: 'exploreData',
        label: ANALYZE_DATA,
        href: uxExploratoryViewLink,
        testId: 'uxAnalyzeBtn',
        tooltipContent: ANALYZE_MESSAGE,
        iconType: 'chartBarVerticalStack',
      },
      items,
    };
  }, [
    application,
    enableInspector,
    http,
    inspector,
    inspectorAdapters,
    rangeFrom,
    rangeTo,
    serviceName,
  ]);
  return { appMenu };
}
