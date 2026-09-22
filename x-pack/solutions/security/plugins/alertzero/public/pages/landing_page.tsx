/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { useWorkers } from '../hooks/use_workers_api';
import {
  useProposalsByCategoryCount,
  useClosedProposalsCount,
} from '../hooks/use_proposals_api';
import { ConversationsPage } from './conversations';
import { OnboardingPage } from './onboarding';

export const LandingPage: React.FC = () => {
  // Latched to true once the queue decision is known, which disables the count
  // queries so they stop polling after navigation (LandingPage stays mounted).
  const [queueDecided, setQueueDecided] = useState(false);

  const workers = useWorkers();
  const respond = useProposalsByCategoryCount('respond', !queueDecided);
  const investigate = useProposalsByCategoryCount('investigate', !queueDecided);
  const configure = useProposalsByCategoryCount('configure', !queueDecided);
  const closed = useClosedProposalsCount(!queueDecided);

  // Positive signals are checked before isLoading so a known result (enabled
  // worker, existing proposals, error) renders the queue immediately without
  // waiting for any sibling query that is still in flight.
  const hasEnabledWorker = workers.data?.workers.some((w) => w.enabled) ?? false;
  const hasProposals =
    (respond.data?.total ?? 0) > 0 ||
    (investigate.data?.total ?? 0) > 0 ||
    (configure.data?.total ?? 0) > 0 ||
    (closed.data?.total ?? 0) > 0;
  const hasAnyError =
    workers.error != null ||
    respond.error != null ||
    investigate.error != null ||
    configure.error != null ||
    closed.error != null;

  const showQueue = queueDecided || hasAnyError || hasEnabledWorker || hasProposals;

  useEffect(() => {
    if (showQueue) setQueueDecided(true);
  }, [showQueue]);

  if (showQueue) {
    return <ConversationsPage />;
  }

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

  return <OnboardingPage />;
};
