/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { SecurityPageName } from '../../../../common/constants';
import { HeaderPage } from '../../../common/components/header_page';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { AiSummaryPanel } from '../../components/ai_summary_panel';
import { DetonationAlertsTable } from '../../components/detonation_alerts_table';
import { FamilyBadges } from '../../components/family_badges';
import { MitrePanel } from '../../components/mitre_panel';
import { ProtectionsBadges } from '../../components/protections_badges';
import { useDetonation } from '../../hooks/use_detonations';
import { useDetonationAlerts } from '../../hooks/use_detonation_alerts';
import { useDetonationMitre } from '../../hooks/use_detonation_mitre';
import { useNavigateToDetonationAlerts } from '../../hooks/use_navigate_to_detonation_alerts';
import {
  DETAIL_AGENT_VERSION,
  DETAIL_ALERTS_TITLE,
  DETAIL_BREADCRUMB,
  DETAIL_DETONATED_AT,
  DETAIL_NOT_FOUND,
  DETAIL_NOT_FOUND_BODY,
  DETAIL_OPEN_IN_ALERTS,
  DETAIL_PLATFORM,
  DETAIL_SOURCE,
  DETAIL_STATUS,
  DETECTION_ALERTS_LABEL,
  ENDPOINT_ALERTS_LABEL,
} from '../../translations';

const Fact: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <EuiFlexItem grow={false}>
    <EuiText size="xs" color="subdued">
      {label}
    </EuiText>
    <EuiText size="s">{value}</EuiText>
  </EuiFlexItem>
);

export const DetonationDetailPage = React.memo(function DetonationDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();

  const { detonation, workerStatus, isValidId, isLoading } = useDetonation(taskId);
  const agentId = detonation?.agentId ?? null;

  const { alerts, isLoading: isLoadingAlerts } = useDetonationAlerts({
    agentId,
    skip: !agentId,
  });

  const { tactics, isLoading: isLoadingMitre } = useDetonationMitre({
    agentId,
    skip: !agentId,
  });

  const { navigateToAlerts } = useNavigateToDetonationAlerts();

  const openInAlerts = useCallback(
    () =>
      navigateToAlerts({
        agentId,
        sampleHash: detonation?.sampleHash,
        timestamp: detonation?.timestamp,
      }),
    [navigateToAlerts, agentId, detonation?.sampleHash, detonation?.timestamp]
  );

  if (isLoading) {
    return (
      <SecuritySolutionPageWrapper>
        <EuiLoadingSpinner size="xl" />
      </SecuritySolutionPageWrapper>
    );
  }

  if (!isValidId || detonation === null) {
    return (
      <SecuritySolutionPageWrapper>
        <EuiEmptyPrompt
          iconType="error"
          color="danger"
          title={<h2>{DETAIL_NOT_FOUND}</h2>}
          body={<p>{DETAIL_NOT_FOUND_BODY}</p>}
        />
        <SpyRoute pageName={SecurityPageName.detonate} />
      </SecuritySolutionPageWrapper>
    );
  }

  return (
    <SecuritySolutionPageWrapper data-test-subj="detonationDetailPage">
      <HeaderPage
        title={detonation.sampleHash ?? taskId}
        backOptions={{ pageId: SecurityPageName.detonate, path: '', text: DETAIL_BREADCRUMB }}
        rightSideItems={[
          <EuiButton key="openInAlerts" iconType="external" onClick={openInAlerts}>
            {DETAIL_OPEN_IN_ALERTS}
          </EuiButton>,
        ]}
      />

      <EuiPanel hasBorder paddingSize="m">
        <EuiFlexGroup gutterSize="xl" wrap>
          <Fact label={DETAIL_DETONATED_AT} value={detonation.timestamp ?? '—'} />
          <Fact label={DETAIL_PLATFORM} value={detonation.platform} />
          <Fact label={DETAIL_AGENT_VERSION} value={detonation.agentVersion ?? '—'} />
          <Fact label={DETAIL_SOURCE} value={detonation.source ?? '—'} />
          <Fact label={DETAIL_STATUS} value={workerStatus ?? '—'} />
          <Fact label={ENDPOINT_ALERTS_LABEL} value={detonation.endpointAlertsCount} />
          <Fact label={DETECTION_ALERTS_LABEL} value={detonation.detectionAlertsCount} />
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="l" wrap alignItems="center">
          <EuiFlexItem grow={false}>
            <FamilyBadges families={detonation.families} categories={detonation.categories} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ProtectionsBadges protections={detonation.protections} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      <EuiSpacer size="l" />

      <MitrePanel
        tactics={tactics}
        isLoading={isLoadingMitre}
        agentId={agentId}
        timestamp={detonation.timestamp}
      />

      <EuiFlexGroup gutterSize="l">
        <EuiFlexItem grow={2}>
          <EuiPanel hasBorder paddingSize="m">
            <EuiTitle size="xs">
              <h3>{DETAIL_ALERTS_TITLE}</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <DetonationAlertsTable alerts={alerts} isLoading={isLoadingAlerts} />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <AiSummaryPanel
            taskId={taskId}
            hasAlerts={detonation.endpointAlertsCount + detonation.detectionAlertsCount > 0}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <SpyRoute pageName={SecurityPageName.detonate} />
    </SecuritySolutionPageWrapper>
  );
});
