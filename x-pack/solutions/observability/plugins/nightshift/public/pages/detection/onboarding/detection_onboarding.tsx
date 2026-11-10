/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import {
  RecommendedSourcesTable,
  type RecommendedSourcesCreationState,
} from '../../../components/entities/source/recommended_sources/recommended_sources_table';
import { SOURCES_NOT_ADDED_TITLE } from '../../../components/entities/source/recommended_sources/translations';
import { DetectionExplainer } from './detection_explainer';
import { DetectionOnboardingLocked } from './detection_onboarding_locked';
import { HOW_DETECTION_WORKS_TITLE, SELECT_SOURCES_TITLE } from './translations';

export const DetectionOnboarding = ({
  canManage,
  isDetectionEnabled,
  onCreationStateChange,
}: {
  canManage: boolean;
  isDetectionEnabled: boolean;
  onCreationStateChange: (state: RecommendedSourcesCreationState) => void;
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      responsive={false}
      css={css`
        inline-size: 100%;
        max-inline-size: 1000px;
        margin-inline: auto;
        row-gap: ${euiTheme.size.xxl};
      `}
      data-test-subj="nightshiftDetectionOnboarding"
    >
      {!isDetectionEnabled && (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h2>{HOW_DETECTION_WORKS_TITLE}</h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <DetectionExplainer />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      )}

      <EuiFlexItem grow={false}>
        {canManage ? (
          <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h2>{isDetectionEnabled ? SOURCES_NOT_ADDED_TITLE : SELECT_SOURCES_TITLE}</h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <RecommendedSourcesTable
                entry="detections_page"
                isDetectionEnabled={isDetectionEnabled}
                onCreationStateChange={onCreationStateChange}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <DetectionOnboardingLocked />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
