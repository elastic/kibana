/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiCallOut,
  EuiPanel,
  EuiButton,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SloHierarchyTree } from './slo_hierarchy_tree';
import { useFetchSloList } from '../../../../hooks/use_fetch_slo_list';

interface Props {
  onSwitchToStandardView?: () => void;
}

export function SloHierarchyView({ onSwitchToStandardView }: Props) {
  // Fetch all SLOs - in production, you might want pagination or filtering
  const {
    data: sloList,
    isLoading,
    isError,
  } = useFetchSloList({
    perPage: 1000, // Fetch more SLOs for hierarchy view
  });

  return (
    <div>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle size="m">
            <h2>
              {i18n.translate('xpack.slo.hierarchyView.title', {
                defaultMessage: 'Hierarchical SLO View',
              })}
            </h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.slo.hierarchyView.subtitle', {
              defaultMessage:
                'View SLOs organized by value stream, business component, and service. Drill down to identify bottlenecks.',
            })}
          </EuiText>
        </EuiFlexItem>
        {onSwitchToStandardView && (
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="sloSloHierarchyViewSwitchToListViewButton"
              onClick={onSwitchToStandardView}
              iconType="list"
            >
              {i18n.translate('xpack.slo.hierarchyView.switchToStandardView', {
                defaultMessage: 'Switch to list view',
              })}
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      <EuiCallOut
        title={i18n.translate('xpack.slo.hierarchyView.calloutTitle', {
          defaultMessage: 'How to use hierarchical view',
        })}
        color="primary"
        iconType="iInCircle"
        size="s"
      >
        <p>
          {i18n.translate('xpack.slo.hierarchyView.calloutDescription', {
            defaultMessage:
              'Tag your SLOs with "value-stream:", "business-component:", and "service:" tags to organize them hierarchically. Example: value-stream:customer-onboarding, business-component:identity-verification, service:id-scanner-api',
          })}
        </p>
      </EuiCallOut>

      <EuiSpacer size="l" />

      {isError && (
        <>
          <EuiCallOut
            announceOnMount
            title={i18n.translate('xpack.slo.hierarchyView.errorTitle', {
              defaultMessage: 'Error loading SLOs',
            })}
            color="danger"
            iconType="alert"
          >
            <p>
              {i18n.translate('xpack.slo.hierarchyView.errorMessage', {
                defaultMessage: 'Unable to fetch SLO data. Please try again.',
              })}
            </p>
          </EuiCallOut>
          <EuiSpacer size="l" />
        </>
      )}

      <SloHierarchyTree sloList={sloList?.results || []} loading={isLoading} />

      <EuiSpacer size="l" />

      {/* Statistics Panel */}
      {sloList && sloList.results.length > 0 && (
        <EuiPanel hasBorder>
          <EuiText size="s">
            <strong>
              {i18n.translate('xpack.slo.hierarchyView.stats', {
                defaultMessage: 'Total SLOs: {total}',
                values: { total: sloList.total },
              })}
            </strong>
          </EuiText>
        </EuiPanel>
      )}
    </div>
  );
}
