/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiAccordion,
  EuiButtonEmpty,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiProgress,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { LoadWhenInView } from '@kbn/observability-shared-plugin/public';
import { useHistory } from 'react-router-dom';
import { isClickMapLongRange, type RumClickMapResponse } from '../../../../common/rum_click_map';
import { useLegacyUrlParams } from '../../../context/url_params_context/use_url_params';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { fetchRumClickMap } from '../../../services/rest/rum_api';
import { pushRumPath, sessionsPatch } from '../../../utils/rum_search';
import { ClickMapStage } from './click_map_stage';
import { UxTourAnchor } from '../rum_tour/ux_tour_anchor';
import { useUxTour } from '../rum_tour/ux_tour_context';

const clickMapTitle = i18n.translate('xpack.ux.overview.clickMap.title', {
  defaultMessage: 'Click map',
});

const clickMapSubtitle = i18n.translate('xpack.ux.overview.clickMap.subtitle', {
  defaultMessage:
    'Where users clicked on this page, over a session replay snapshot of the same viewport.',
});

export function ClickMapPanel() {
  const {
    urlParams: { start, end, rangeFrom, rangeTo },
  } = useLegacyUrlParams();
  const isLongRange = isClickMapLongRange(start ?? rangeFrom, end ?? rangeTo);
  const tour = useUxTour();
  const tourOpen = Boolean(
    tour?.isActive && tour.toursEnabled && tour.stepConfig?.stepId === 'clickMap'
  );
  const [isOpen, setIsOpen] = useState(!isLongRange || tourOpen);

  useEffect(() => {
    setIsOpen(tourOpen || !isLongRange);
  }, [isLongRange, tourOpen]);

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="uxClickMapPanel">
      <EuiAccordion
        id="uxClickMapAccordion"
        data-test-subj="uxClickMapAccordion"
        forceState={isOpen ? 'open' : 'closed'}
        onToggle={setIsOpen}
        buttonContent={
          <div>
            <UxTourAnchor stepId="clickMap">
              <div data-test-subj="uxClickMapTitle">
                <EuiTitle size="xs">
                  <h3>{clickMapTitle}</h3>
                </EuiTitle>
                <EuiText size="xs" color="subdued">
                  {clickMapSubtitle}
                </EuiText>
              </div>
            </UxTourAnchor>
          </div>
        }
        extraAction={
          isLongRange && !isOpen ? (
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.ux.overview.clickMap.longRangeDescription', {
                defaultMessage: 'Longer than 30 days — expand to load.',
              })}
            </EuiText>
          ) : undefined
        }
      >
        <EuiSpacer size="m" />
        {isOpen && (
          <LoadWhenInView initialHeight={420} placeholderTitle={clickMapTitle}>
            <ClickMapContent />
          </LoadWhenInView>
        )}
      </EuiAccordion>
    </EuiPanel>
  );
}

function ClickMapContent() {
  const { http } = useKibanaServices();
  const history = useHistory();
  const {
    rangeId,
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
      botUa,
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
  const cancelledRef = useRef(false);

  useEffect(() => {
    setUserPage('');
  }, [globalPage]);

  const load = useCallback(async () => {
    void rangeId;
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
        botUa,
        kuery,
        breakpoint,
        connection,
        device,
      });
      if (cancelledRef.current) {
        return;
      }
      setData(result);
    } catch (err) {
      if (cancelledRef.current) {
        return;
      }
      setError(err instanceof Error ? err.message : String(err));
      setData(null);
    } finally {
      if (!cancelledRef.current) {
        setLoading(false);
      }
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
    botUa,
    kuery,
    breakpoint,
    connection,
    device,
    rangeId,
  ]);

  useEffect(() => {
    cancelledRef.current = false;
    void load();
    return () => {
      cancelledRef.current = true;
    };
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
    <div style={{ position: 'relative' }}>
      {loading && (
        <EuiProgress
          size="xs"
          color="accent"
          position="absolute"
          data-test-subj="uxClickMapLoading"
          aria-label={i18n.translate('xpack.ux.overview.clickMap.loadingAriaLabel', {
            defaultMessage: 'Loading click map',
          })}
        />
      )}
      <EuiFlexGroup justifyContent="flexEnd" alignItems="center" gutterSize="m" wrap>
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

      {(pageOptions.options.length > 0 || data?.snapshot?.sessionId) && <EuiSpacer size="m" />}

      {loading && !data && (
        <EuiFlexGroup
          justifyContent="center"
          alignItems="center"
          style={{ minHeight: 200 }}
          data-test-subj="uxClickMapSpinner"
        >
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
          <ClickMapStage
            snapshot={data.snapshot}
            clicks={data.clicks}
            sampledClicks={data.sampledClicks}
            onViewSessions={(sessionIds) => {
              pushRumPath(
                history,
                '/session-replay',
                sessionsPatch({ sessionIds: sessionIds.join(',') })
              );
            }}
          />
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
    </div>
  );
}
