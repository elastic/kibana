/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import { SloListCardView } from './card_view/slos_card_view';
import { SloListCompactView } from './compact_view/slo_list_compact_view';
import { HealthCallout } from './health_callout/health_callout';
import { SloListEmpty } from './slo_list_empty';
import { SloListError } from './slo_list_error';
import { SloListView } from './slo_list_view/slo_list_view';
import { SLOView } from './toggle_slo_view';

export interface Props {
  sloList: SLOWithSummaryResponse[];
  loading: boolean;
  error: boolean;
  view: SLOView;
}

export function SlosView({ sloList, loading, error, view }: Props) {
  if (!loading && !error && sloList.length === 0) {
    return <SloListEmpty />;
  }

  if (!loading && error) {
    return <SloListError />;
  }

  if (view === 'cardView') {
    return (
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <HealthCallout sloList={sloList} />
        </EuiFlexItem>
        <EuiFlexItem>
          <SloListCardView sloList={sloList} loading={loading} error={error} />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (view === 'compactView') {
    return (
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <HealthCallout sloList={sloList} />
        </EuiFlexItem>
        <EuiFlexItem>
          <SloListCompactView sloList={sloList} loading={loading} error={error} />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <HealthCallout sloList={sloList} />
      </EuiFlexItem>
      <EuiFlexItem>
        <SloListView sloList={sloList} loading={loading} error={error} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
