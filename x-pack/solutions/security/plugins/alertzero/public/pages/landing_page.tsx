/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useWorkers } from '../hooks/use_workers_api';
import { useProposalsByCategory } from '../hooks/use_proposals_api';
import { ConversationsPage } from './conversations';
import { OnboardingPage } from './onboarding';

export const LandingPage: React.FC = () => {
  const workers = useWorkers();
  const respond = useProposalsByCategory('respond');
  const investigate = useProposalsByCategory('investigate');

  const isLoading = workers.isLoading || respond.isLoading || investigate.isLoading;

  if (isLoading) return null;

  const hasAnyError = workers.error != null || respond.error != null || investigate.error != null;
  const hasEnabledWorker = workers.data?.workers.some((w) => w.enabled) ?? false;
  const hasInvestigations =
    (respond.data?.total ?? 0) > 0 || (investigate.data?.total ?? 0) > 0;

  if (hasAnyError || hasEnabledWorker || hasInvestigations) {
    return <ConversationsPage />;
  }

  return <OnboardingPage />;
};
