/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { useWorkers } from '../hooks/use_workers_api';
import {
  useProposalsByCategoryCount,
  useClosedProposalsCount,
} from '../hooks/use_proposals_api';
import { ConversationsPage } from './conversations';
import { OnboardingPage } from './onboarding';

export const LandingPage: React.FC = () => {
  const workers = useWorkers();
  const respond = useProposalsByCategoryCount('respond', true);
  const investigate = useProposalsByCategoryCount('investigate', true);
  const configure = useProposalsByCategoryCount('configure', true);
  const closed = useClosedProposalsCount(true);

  const isLoading =
    workers.isLoading ||
    respond.isLoading ||
    investigate.isLoading ||
    configure.isLoading ||
    closed.isLoading;

  if (isLoading) {
    return (
      <EuiFlexGroup justifyContent="center" style={{ minHeight: 200 }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  const hasAnyError =
    workers.error != null ||
    respond.error != null ||
    investigate.error != null ||
    configure.error != null ||
    closed.error != null;
  const hasEnabledWorker = workers.data?.workers.some((w) => w.enabled) ?? false;
  const hasProposals =
    (respond.data?.total ?? 0) > 0 ||
    (investigate.data?.total ?? 0) > 0 ||
    (configure.data?.total ?? 0) > 0 ||
    (closed.data?.total ?? 0) > 0;

  if (hasAnyError || hasEnabledWorker || hasProposals) {
    return <ConversationsPage />;
  }

  return <OnboardingPage />;
};
