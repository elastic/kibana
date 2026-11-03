/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import type { AppMenuConfig, AppMenuItemType } from '@kbn/core-chrome-app-menu-components';
import { RECORDS_FIELD, createExploratoryViewUrl } from '@kbn/exploratory-view-plugin/public';
import { useInspectorContext } from '@kbn/observability-shared-plugin/public';
import { useLegacyUrlParams } from '../context/url_params_context/use_url_params';
import { SERVICE_NAME } from '../../common/elasticsearch_fieldnames';
import { uxAppHref } from '../utils/rum_search';
import { uxSettingsSuffix } from '../utils/ux_app_path';
import { useKibanaServices } from './use_kibana_services';

const ANALYZE_DATA = i18n.translate('xpack.ux.analyzeDataButtonLabel', {
  defaultMessage: 'Explore data',
});

const ANALYZE_MESSAGE = i18n.translate('xpack.ux.analyzeDataButtonLabel.message', {
  defaultMessage:
    'Go to Explore Data, where you can select and filter result data in any dimension and look for the cause or impact of performance problems.',
});

const SETTINGS_LABEL = i18n.translate('xpack.ux.headerSettingsButtonLabel', {
  defaultMessage: 'Settings',
});

const SETTINGS_MESSAGE = i18n.translate('xpack.ux.headerSettingsButtonLabel.message', {
  defaultMessage: 'UX-wide capture and analytics settings.',
});

const APP_SETTINGS_MESSAGE = i18n.translate('xpack.ux.headerSettingsButtonLabel.appMessage', {
  defaultMessage: 'Settings for this application.',
});

const INJECT_SNIPPET_LABEL = i18n.translate('xpack.ux.headerInjectSnippetLinkText', {
  defaultMessage: 'Inject snippet',
});

const INJECT_SNIPPET_MESSAGE = i18n.translate('xpack.ux.headerInjectSnippetTooltip', {
  defaultMessage: 'Load the browser SDK from the collector, or copy a CSP-safe console snippet.',
});

export function useAppMenu(enableInspector: boolean) {
  const { application, http, inspector } = useKibanaServices();
  const { search } = useLocation();
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

    const uxSettingsHref = uxAppHref(http.basePath.prepend, {
      search,
      serviceName,
      suffix: uxSettingsSuffix(serviceName),
    });
    const uxInjectHref = uxAppHref(http.basePath.prepend, {
      search,
      serviceName,
      suffix: '/settings/inject',
    });

    const items = [
      {
        id: 'settings',
        label: SETTINGS_LABEL,
        href: uxSettingsHref,
        iconType: 'gear',
        testId: 'uxHeaderSettingsLink',
        tooltipContent: serviceName ? APP_SETTINGS_MESSAGE : SETTINGS_MESSAGE,
      },
      {
        id: 'injectSnippet',
        label: INJECT_SNIPPET_LABEL,
        href: uxInjectHref,
        iconType: 'code',
        testId: 'uxHeaderInjectSnippetLink',
        tooltipContent: INJECT_SNIPPET_MESSAGE,
      },
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
        testId: 'uxInspectHeaderLink',
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
    search,
    serviceName,
  ]);
  return { appMenu };
}
