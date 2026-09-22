/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { useWorkers } from '../hooks/use_workers_api';
import { useProposalsByCategoryCount, useClosedProposalsCount } from '../hooks/use_proposals_api';
import { ConversationsPage } from './conversations';
import { OnboardingPage } from './onboarding';

export const LandingPage: React.FC = () => {
  // Once latched, queries are disabled so they stop polling while LandingPage
  // remains mounted as a wrapper. 'onboarding' also prevents the spinner from
  // re-appearing on every background poll after the decision is confirmed.
  const [decision, setDecision] = useState<'queue' | 'onboarding' | null>(null);

  const queryEnabled = decision === null;
  const workers = useWorkers();
  const respond = useProposalsByCategoryCount('respond', queryEnabled);
  const investigate = useProposalsByCategoryCount('investigate', queryEnabled);
  const configure = useProposalsByCategoryCount('configure', queryEnabled);
  const closed = useClosedProposalsCount(queryEnabled);

  // Positive signals short-circuit before isLoading/isFetching so a known
  // result renders the queue immediately without waiting for sibling queries.
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

  const showQueue = decision === 'queue' || hasAnyError || hasEnabledWorker || hasProposals;

  // isFetching covers background refetches of stale cached empty results that
  // would otherwise fall through to onboarding before the fresh response lands.
  const isUnresolved =
    workers.isLoading ||
    workers.isFetching ||
    respond.isLoading ||
    respond.isFetching ||
    investigate.isLoading ||
    investigate.isFetching ||
    configure.isLoading ||
    configure.isFetching ||
    closed.isLoading ||
    closed.isFetching;

  // Only latch once data is fresh (not fetching). Stale positive cache renders
  // the queue optimistically but must not permanently lock the decision before
  // the fresh response confirms or contradicts it.
  useEffect(() => {
    if (decision !== null || isUnresolved) return;
    setDecision(showQueue ? 'queue' : 'onboarding');
  }, [decision, showQueue, isUnresolved]);

  if (showQueue) return <ConversationsPage />;

  // Guard on decision === null so the spinner only appears before the initial
  // resolution; after the onboarding decision is latched we render directly.
  if (decision === null && isUnresolved) {
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
