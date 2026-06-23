/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * DEV / PR preview only — remove this page and its route before merging to main.
 *
 * Navigate to: /app/security/dev-graph
 *
 * Mock data uses scenarioComplexPreview (see use_fetch_graph_data.ts).
 */

import React, { useEffect, useState } from 'react';
import { EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { GraphInvestigation } from '@kbn/cloud-security-posture-graph';
import { useKibana } from '../common/lib/kibana';

const TIME_RANGE = {
  from: 'now-24h',
  to: 'now',
};

const ORIGIN_ENTITY_IDS = [
  { id: 'dev-origin-alice', isOrigin: true },
  { id: 'metadata-preview-target', isOrigin: true },
];

const ORIGIN_EVENT_IDS = [
  { id: 'dev-event-1', isAlert: true },
  { id: 'dev-event-2', isAlert: false },
];

export const DevGraphPage = () => {
  const { dataViews } = useKibana().services;
  const [dataView, setDataView] = useState<DataView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dataViews
      .getDefaultDataView()
      .then((dv) => {
        if (dv) {
          setDataView(dv);
        } else {
          dataViews
            .create({ title: '.alerts-*', timeFieldName: '@timestamp' })
            .then(setDataView)
            .catch(() => setError('Could not create data view'));
        }
      })
      .catch(() => setError('Could not load default data view'));
  }, [dataViews]);

  if (error) {
    return <EuiText color="danger">{error}</EuiText>;
  }

  if (!dataView) {
    return (
      <div
        css={css`
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
        `}
      >
        <EuiLoadingSpinner size="xl" />
      </div>
    );
  }

  return (
    <GraphInvestigation
      scopeId="dev-graph-preview"
      initialState={{
        dataView,
        originEventIds: ORIGIN_EVENT_IDS,
        entityIds: ORIGIN_ENTITY_IDS,
        timeRange: TIME_RANGE,
      }}
      showToggleSearch={false}
      showInvestigateInTimeline={true}
      css={css`
        height: 100vh;
        width: 100%;
      `}
    />
  );
};
