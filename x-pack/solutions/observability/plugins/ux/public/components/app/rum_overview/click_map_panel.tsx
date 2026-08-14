/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import type { RumClickMapResponse } from '../../../../common/rum_click_map';
import { useLegacyUrlParams } from '../../../context/url_params_context/use_url_params';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { fetchRumClickMap } from '../../../services/rest/rum_api';
import { pushRumPath } from '../../../utils/rum_search';
import { ClickMapStage } from './click_map_stage';

export function ClickMapPanel() {
  const { http } = useKibanaServices();
  const history = useHistory();
  const {
    urlParams: {
      rangeFrom = 'now-24h',
      rangeTo = 'now',
      serviceName,
      browser,
      os,
      location,
      pageUrl,
      frustration,
      user,
      includeBots,
      kuery,
      breakpoint,
      connection,
      device,
    },
  } = useLegacyUrlParams();

  const locationFilter = typeof location === 'string' ? location : undefined;
  const globalPage = typeof pageUrl === 'string' ? pageUrl : '';
  const [userPage, setUserPage] = useState('');
  const pageForQuery = userPage || globalPage || undefined;
  const [data, setData] = useState<RumClickMapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUserPage('');
  }, [globalPage]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchRumClickMap({
        http,
        rangeFrom,
        rangeTo,
        serviceName: typeof serviceName === 'string' ? serviceName : undefined,
        browser,
        os,
        location: locationFilter,
        pageUrl: pageForQuery,
        frustration,
        user,
        includeBots,
        kuery,
        breakpoint,
        connection,
        device,
      });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [
    http,
    rangeFrom,
    rangeTo,
    serviceName,
    browser,
    os,
    locationFilter,
    pageForQuery,
    frustration,
    user,
    includeBots,
    kuery,
    breakpoint,
    connection,
    device,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const pageOptions = useMemo(() => {
    const pages = data?.pages ?? [];
    const options = pages.map((page) => ({ value: page.key, text: `${page.key} (${page.count})` }));
    const current = pageForQuery || data?.pagePath || '';
    if (current && !options.some((option) => option.value === current)) {
      options.unshift({ value: current, text: current });
    }
    return { options, current };
  }, [data?.pages, data?.pagePath, pageForQuery]);

  const lockedToFilter = Boolean(globalPage);

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="uxClickMapPanel">
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="m" wrap>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.ux.overview.clickMap.title', {
                defaultMessage: 'Click map',
              })}
            </h3>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.ux.overview.clickMap.subtitle', {
              defaultMessage:
                'Where users clicked on this page, over a session replay snapshot of the same viewport.',
            })}
          </EuiText>
        </EuiFlexItem>
        {pageOptions.options.length > 0 && (
          <EuiFlexItem grow={false} style={{ minWidth: 220 }}>
            <EuiSelect
              compressed
              disabled={lockedToFilter}
              options={pageOptions.options}
              value={pageOptions.current}
              onChange={(event) => setUserPage(event.target.value)}
              aria-label={i18n.translate('xpack.ux.overview.clickMap.pageAriaLabel', {
                defaultMessage: 'Page for click map',
              })}
              data-test-subj="uxClickMapPageSelect"
            />
          </EuiFlexItem>
        )}
        {data?.snapshot?.sessionId && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              data-test-subj="uxClickMapOpenReplay"
              onClick={() => {
                const sessionId = data.snapshot?.sessionId;
                if (!sessionId) {
                  return;
                }
                pushRumPath(history, `/session-replay/${encodeURIComponent(sessionId)}/replay`);
              }}
            >
              {i18n.translate('xpack.ux.overview.clickMap.openReplay', {
                defaultMessage: 'Open snapshot replay',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {loading && !data && (
        <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}

      {error && (
        <EuiCallOut
          announceOnMount
          color="danger"
          title={i18n.translate('xpack.ux.overview.clickMap.errorTitle', {
            defaultMessage: 'Unable to load click map',
          })}
        >
          <p>{error}</p>
        </EuiCallOut>
      )}

      {!loading && data && !data.snapshot && data.clicks.length === 0 && (
        <EuiEmptyPrompt
          titleSize="xs"
          title={
            <h4>
              {i18n.translate('xpack.ux.overview.clickMap.emptyTitle', {
                defaultMessage: 'No replay snapshot in this range',
              })}
            </h4>
          }
          body={
            <p>
              {i18n.translate('xpack.ux.overview.clickMap.emptyBody', {
                defaultMessage:
                  'The click map uses a session replay snapshot of this page. Open a session with replay for this web app, then refresh.',
              })}
            </p>
          }
        />
      )}

      {data && data.snapshot && (
        <>
          <ClickMapStage snapshot={data.snapshot} clicks={data.clicks} />
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.ux.overview.clickMap.stats', {
              defaultMessage:
                '{clicks} clicks on {page} ({viewport} hidden below the fold). Snapshot {width}×{height}.',
              values: {
                clicks: data.sampledClicks,
                page: data.pagePath ?? '—',
                viewport: data.hiddenOffViewport,
                width: data.snapshot.width,
                height: data.snapshot.height,
              },
            })}
          </EuiText>
        </>
      )}

      {data && data.clicks.length > 0 && !data.snapshot && (
        <EuiCallOut
          announceOnMount
          color="warning"
          title={i18n.translate('xpack.ux.overview.clickMap.noSnapshotTitle', {
            defaultMessage: 'Clicks found, but no replay snapshot for this page',
          })}
        >
          <p>
            {i18n.translate('xpack.ux.overview.clickMap.noSnapshotBody', {
              defaultMessage:
                '{clicks} clicks have coordinates. Capture a session with Session Replay on this page to use it as the map background.',
              values: { clicks: data.sampledClicks },
            })}
          </p>
        </EuiCallOut>
      )}
    </EuiPanel>
  );
}
