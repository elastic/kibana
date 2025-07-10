/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ApplicationStart, ChromeBreadcrumb, ChromeStart } from '@kbn/core/public';
import { MouseEvent, useEffect, useMemo } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ChromeBreadcrumbsAppendExtension } from '@kbn/core-chrome-browser';
import type { ServerlessPluginStart } from '@kbn/serverless/public';
import useObservable from 'react-use/lib/useObservable';
import { useQueryParams } from './use_query_params';

const OBSERVABILITY_TEXT = i18n.translate(
  'xpack.observabilityShared.breadcrumbs.observabilityLinkText',
  {
    defaultMessage: 'Observability',
  }
);

function addClickHandlers(
  breadcrumbs: ChromeBreadcrumb[],
  navigateToHref?: (url: string) => Promise<void>
) {
  return breadcrumbs.map((bc) => ({
    ...bc,
    ...(bc.href
      ? {
          onClick: (event: MouseEvent) => {
            if (navigateToHref && bc.href) {
              event.preventDefault();
              navigateToHref(bc.href);
            }
          },
        }
      : {}),
  }));
}

function getTitleFromBreadCrumbs(breadcrumbs: ChromeBreadcrumb[]) {
  return breadcrumbs
    .map(({ text }) => text?.toString() ?? '')
    .reverse()
    .concat([OBSERVABILITY_TEXT]);
}

/**
 *
 * By default the breadcrumbs will be passed to either serverless.setBreadcrumbs or chrome.setBreadcrumbs depending on the
 * environment. The breadcrumbs will *also* be passed to the project style breadcrumbs for stateful project style. We will use "project style"
 * here to refer to serverless chrome and stateful project style chrome. Classic refers to stateful classic chrome.
 *
 * Project style breadcrumbs add a root crumb ("deployment" etc) and "nav crumbs" which are derived from the navigation structure. By default
 * the "absolute" mode is used which means the breadcrumbs passed here will omit the navigation derived "nav crumbs". You can pass
 * absoluteProjectStyleBreadcrumbs: false to include the 'smart' "nav crumbs".
 *
 * In classic mode (not project style) the 'Observability' crumb is added.
 *
 * You can also pass classicOnly to only set breadrumbs in the classic chrome context. This can be useful if your solution just wants to defer all project style crumbs to the "nav crumbs".
 */
export const useBreadcrumbs = (
  extraCrumbs: ChromeBreadcrumb[],
  options?: {
    app?: { id: string; label: string };
    breadcrumbsAppendExtension?: ChromeBreadcrumbsAppendExtension;
    serverless?: ServerlessPluginStart;
    absoluteProjectStyleBreadcrumbs?: boolean;
    classicOnly?: boolean;
  }
) => {
  const params = useQueryParams();
  const { app, breadcrumbsAppendExtension, serverless } = options ?? {};
  const absolute = options?.absoluteProjectStyleBreadcrumbs === false ? false : true;
  const classicOnly = options?.classicOnly ?? false;

  const {
    services: {
      chrome: {
        docTitle,
        setBreadcrumbs: chromeSetBreadcrumbs,
        setBreadcrumbsAppendExtension,
        getChromeStyle$,
      },
      application: { getUrlForApp, navigateToUrl },
    },
  } = useKibana<{
    application: ApplicationStart;
    chrome: ChromeStart;
  }>();
  const setTitle = docTitle.change;
  const appPath = getUrlForApp(app?.id ?? 'observability-overview') ?? '';
  const chromeStyle = useObservable(getChromeStyle$());

  const setBreadcrumbs = useMemo(() => {
    if (!serverless?.setBreadcrumbs) {
      return (breadcrumbs: ChromeBreadcrumb[]) =>
        chromeSetBreadcrumbs?.(
          breadcrumbs,
          !classicOnly
            ? {
                project: {
                  value: breadcrumbs,
                  absolute,
                },
              }
            : undefined
        );
    }
    if (!classicOnly)
      return (breadcrumbs: ChromeBreadcrumb[]) =>
        serverless?.setBreadcrumbs(breadcrumbs, { absolute });
  }, [serverless, classicOnly, absolute, chromeSetBreadcrumbs]);

  useEffect(() => {
    if (breadcrumbsAppendExtension) {
      return setBreadcrumbsAppendExtension(breadcrumbsAppendExtension);
    }
  }, [breadcrumbsAppendExtension, setBreadcrumbsAppendExtension]);

  useEffect(() => {
    const isProjectStyle = serverless || chromeStyle === 'project';
    const breadcrumbs = isProjectStyle
      ? extraCrumbs
      : [
          {
            text: app?.label ?? OBSERVABILITY_TEXT,
            href: appPath + '/overview',
          },
          ...extraCrumbs,
        ];

    if (setBreadcrumbs) {
      setBreadcrumbs(addClickHandlers(breadcrumbs, navigateToUrl));
    }
    if (setTitle) {
      setTitle(getTitleFromBreadCrumbs(extraCrumbs));
    }
  }, [
    app?.label,
    appPath,
    chromeStyle,
    extraCrumbs,
    navigateToUrl,
    params,
    serverless,
    setBreadcrumbs,
    setTitle,
  ]);
};
