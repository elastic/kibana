/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import type { TimeRange } from '@kbn/es-query';
import type { Subject } from 'rxjs';
import { css } from '@emotion/react';
import { ALL_VALUE } from '@kbn/slo-schema';
import { observabilityPaths } from '@kbn/observability-plugin/common';
import type { FetchContext } from '@kbn/presentation-publishing';
import { SloIncludedCount } from './components/slo_included_count';
import { SloAlertsSummary } from './components/slo_alerts_summary';
import { SloAlertsTable } from './components/slo_alerts_table';
import type { SloItem, SloEmbeddableDeps } from './types';

interface Props {
  deps: SloEmbeddableDeps;
  slos: SloItem[];
  timeRange: TimeRange;
  onRenderComplete?: () => void;
  reloadSubject: Subject<FetchContext>;
  onEdit: () => void;
}

export function SloAlertsWrapper({
  slos,
  deps,
  timeRange: initialTimeRange,
  onRenderComplete,
  reloadSubject,
  onEdit,
}: Props) {
  const {
    application: { navigateToUrl },
    http: { basePath },
  } = deps;

  const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange);
  const [lastRefreshTime, setLastRefreshTime] = useState<number | undefined>(undefined);

  useEffect(() => {
    const subs = reloadSubject?.subscribe((input) => {
      if (input) {
        const { timeRange: nTimeRange } = input;
        if (nTimeRange && (nTimeRange.from !== timeRange.from || nTimeRange.to !== timeRange.to)) {
          setTimeRange(nTimeRange);
        }
      }
      setLastRefreshTime(Date.now());
    });
    return () => {
      subs?.unsubscribe();
    };
  }, [reloadSubject, timeRange.from, timeRange.to]);

  useEffect(() => {
    setTimeRange(initialTimeRange);
  }, [initialTimeRange]);

  const [isSummaryLoaded, setIsSummaryLoaded] = useState(false);
  const [isTableLoaded, setIsTableLoaded] = useState(false);
  useEffect(() => {
    if (isSummaryLoaded && isTableLoaded && onRenderComplete) {
      onRenderComplete();
    }
  }, [isSummaryLoaded, isTableLoaded, onRenderComplete]);
  /**
   * When every selected row is all-instances (*), show SloIncludedCount: "N SLOs (M Instances) included"
   * (fetches total instance count from the SLO API). If any row is a specific instance id, show only
   * "N SLOs included" (row count, no parenthetical) so mixed * + specific selections are not mislabeled.
   */
  const showInstanceCountBreakdown =
    slos.length > 0 && slos.every((s) => s.slo_instance_id === ALL_VALUE);

  const handleGoToAlertsClick = () => {
    const kuery = slos
      .map((slo) =>
        slo.slo_instance_id !== ALL_VALUE
          ? `(slo.id:"${slo.slo_id}" and slo.instanceId:"${slo.slo_instance_id}")`
          : `(slo.id:"${slo.slo_id}")`
      )
      .join(' or ');

    navigateToUrl(
      `${basePath.prepend(observabilityPaths.alerts)}?_a=(kuery:'${kuery}',rangeFrom:${
        timeRange.from
      },rangeTo:${timeRange.to})`
    );
  };
  return (
    <div
      css={css`
        width: 100%;
        overflow: scroll;
      `}
    >
      <EuiFlexGroup
        data-shared-item=""
        justifyContent="flexEnd"
        wrap
        css={css`
          margin: 0 35px;
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiLink
            onClick={() => {
              onEdit();
            }}
            data-test-subj="o11ySloAlertsWrapperSlOsIncludedLink"
          >
            {showInstanceCountBreakdown ? (
              <SloIncludedCount slos={slos} />
            ) : (
              i18n.translate('xpack.slo.sloAlertsWrapper.sLOsIncludedFlexItemLabel', {
                defaultMessage:
                  '{numOfSlos, number} {numOfSlos, plural, one {SLO} other {SLOs}} included',
                values: {
                  numOfSlos: slos.length,
                },
              })
            )}
          </EuiLink>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiLink
            data-test-subj="o11ySloAlertsWrapperGoToAlertsLink"
            onClick={handleGoToAlertsClick}
          >
            <FormattedMessage
              id="xpack.slo.sloAlertsWrapper.goToAlertsFlexItemLabel"
              defaultMessage="Go to alerts"
            />
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup direction="column" style={{ margin: '10px' }} responsive={true}>
        <EuiFlexItem>
          <SloAlertsSummary
            slos={slos}
            deps={deps}
            timeRange={timeRange}
            onLoaded={() => setIsSummaryLoaded(true)}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <SloAlertsTable
            slos={slos}
            deps={deps}
            timeRange={timeRange}
            onLoaded={() => setIsTableLoaded(true)}
            lastReloadRequestTime={lastRefreshTime}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
