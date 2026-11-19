/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  EuiButtonEmpty,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { WebCrawlerPublicStart } from '@kbn/web-crawler-plugin/public';
import { STORAGE_KEY_PREFIX, WEB_CRAWLS_ROUTE } from '../../../home_config';
import { useKibana } from '../../../hooks/use_kibana';
import { ANALYTICS_TELEMETRY_PREFIX, FIRST_WEB_CRAWL_MAX_PAGES } from '../../constants';
import { useAnalyticsClusterState } from '../../hooks/use_analytics_cluster_state';
import type { WebCrawlFlyoutApi } from './web_crawl_flyout_context';
import { WebCrawlFlyoutContext } from './web_crawl_flyout_context';

interface WebCrawlFlyoutProps {
  WebCrawlPanel: WebCrawlerPublicStart['WebCrawlPanel'];
  onManageWebCrawls: () => void;
  onClose: () => void;
}

const WebCrawlFlyout = ({
  WebCrawlPanel,
  onManageWebCrawls,
  onClose,
}: WebCrawlFlyoutProps): React.JSX.Element => {
  const titleId = useGeneratedHtmlId({ prefix: 'analyticsWebCrawlFlyoutTitle' });
  const { state } = useAnalyticsClusterState();
  // Once the cluster holds data the page underneath has already changed, or never will.
  const isPageChangeAhead = state === undefined || state.stage === 'noData';

  return (
    <EuiFlyout
      onClose={onClose}
      size="m"
      aria-labelledby={titleId}
      data-test-subj="analyticsWebCrawlFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>
            {i18n.translate('xpack.searchHomepage.analytics.webCrawlFlyout.title', {
              defaultMessage: 'Crawl a website',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.searchHomepage.analytics.webCrawlFlyout.description', {
              defaultMessage:
                'A crawl runs in the background and can take several minutes. You can close this panel while it runs.',
            })}
          </p>
          <p data-test-subj="analyticsWebCrawlFlyoutPageLimit">
            {i18n.translate('xpack.searchHomepage.analytics.webCrawlFlyout.pageLimit', {
              defaultMessage:
                'Crawls up to {maxPages, plural, one {# page} other {# pages}} to start. Change the limit under Advanced options.',
              values: { maxPages: FIRST_WEB_CRAWL_MAX_PAGES },
            })}
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <WebCrawlPanel
          telemetryPrefix={ANALYTICS_TELEMETRY_PREFIX}
          // The search home follows the last crawl stored under this prefix, so it picks this one up.
          storageKeyPrefix={STORAGE_KEY_PREFIX}
          optionsDisplay="collapsed"
          defaultMaxDocuments={FIRST_WEB_CRAWL_MAX_PAGES}
          onManageWebCrawls={onManageWebCrawls}
        />
        <EuiSpacer size="m" />
        <EuiText size="s" color="subdued">
          <p data-test-subj="analyticsWebCrawlFlyoutNextStep">
            {isPageChangeAhead
              ? i18n.translate('xpack.searchHomepage.analytics.webCrawlFlyout.nextStep', {
                  defaultMessage:
                    'When the first page is indexed, this page changes to show what you can do with your search data. The progress of the crawl stays here and under Add data on the home page.',
                })
              : i18n.translate('xpack.searchHomepage.analytics.webCrawlFlyout.progress', {
                  defaultMessage:
                    'The progress of the crawl stays here and under Add data on the home page.',
                })}
          </p>
        </EuiText>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButtonEmpty
          flush="left"
          onClick={onClose}
          data-test-subj="analyticsWebCrawlFlyoutClose"
          data-telemetry-id={`${ANALYTICS_TELEMETRY_PREFIX}-webCrawlFlyout-close`}
        >
          {i18n.translate('xpack.searchHomepage.analytics.webCrawlFlyout.closeButton', {
            defaultMessage: 'Close',
          })}
        </EuiButtonEmpty>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

/**
 * Owns the flyout that crawls a website. It sits above the pages, so the flyout stays open with
 * the running crawl in view when the arrival of the first page replaces the page underneath.
 */
export const WebCrawlFlyoutProvider = ({ children }: PropsWithChildren): React.JSX.Element => {
  const { history, webCrawler } = useKibana().services;
  const { pathname } = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const openerRef = useRef<HTMLElement | null>(null);

  const open = useCallback((opener?: HTMLElement | null): void => {
    openerRef.current = opener ?? null;
    setIsOpen(true);
  }, []);

  const close = useCallback((): void => {
    setIsOpen(false);
    // The opener is gone when the page was replaced while the flyout was open.
    if (openerRef.current?.isConnected) {
      openerRef.current.focus();
    }
    openerRef.current = null;
  }, []);

  useEffect(() => {
    openerRef.current = null;
    setIsOpen(false);
  }, [pathname]);

  const onManageWebCrawls = useCallback((): void => history.push(WEB_CRAWLS_ROUTE), [history]);

  const api = useMemo(
    (): WebCrawlFlyoutApi => ({ isAvailable: webCrawler !== undefined, open }),
    [webCrawler, open]
  );

  return (
    <WebCrawlFlyoutContext.Provider value={api}>
      {children}
      {isOpen && webCrawler !== undefined && (
        <WebCrawlFlyout
          WebCrawlPanel={webCrawler.WebCrawlPanel}
          onManageWebCrawls={onManageWebCrawls}
          onClose={close}
        />
      )}
    </WebCrawlFlyoutContext.Provider>
  );
};
