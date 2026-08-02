/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { classifyQueryError } from '../helpers/classify_query_error';
import { getErrorMessage } from '../helpers/get_error_message';
import { PndAttackDiscoveryDisabledState } from '../pnd_attack_discovery_disabled_state';
import { PndEmptyState } from '../pnd_empty_state';
import { PndErrorState } from '../pnd_error_state';
import { PndLoadingState } from '../pnd_loading_state';
import { PndWorkflowsUnavailableState } from '../pnd_workflows_unavailable_state';
import * as i18n from '../translations';

export interface PndQueryStateProps {
  /** Rendered only when there is nothing else to report. */
  children?: React.ReactNode;
  emptyBody?: React.ReactNode;
  emptyTitle: string;
  /** The react-query error, or `null` / `undefined` when the read succeeded. */
  error: unknown;
  /**
   * `false` when the response reported that Attack Discovery workflows are off
   * in this space. Leave `undefined` when the route does not say.
   */
  isAttackDiscoveryWorkflowsEnabled?: boolean;
  /** `true` when the read succeeded but there is nothing to render. */
  isEmpty: boolean;
  isLoading: boolean;
  loadingLabel?: string;
  onRetry?: () => void;
}

/**
 * The single place PND decides what a query result looks like on screen, so
 * every page distinguishes the same five outcomes the same way:
 *
 * | Outcome | Renders |
 * |---|---|
 * | in flight | a spinner |
 * | 503 | "Workflows unavailable" — **never** "nothing to do" |
 * | any other failure (500 included) | an error state — **never** the empty state |
 * | 200, empty, feature off in this space | the advanced-setting state |
 * | 200, empty, feature on | the ordinary empty state |
 *
 * Loading wins over empty so a first paint never flashes "nothing here", and an
 * error wins over empty because a failed read says nothing about emptiness.
 */
export const PndQueryState: React.FC<PndQueryStateProps> = ({
  children,
  emptyBody,
  emptyTitle,
  error,
  isAttackDiscoveryWorkflowsEnabled,
  isEmpty,
  isLoading,
  loadingLabel,
  onRetry,
}) => {
  if (isLoading) {
    return <PndLoadingState label={loadingLabel} />;
  }

  if (error != null) {
    if (classifyQueryError(error) === 'workflowsUnavailable') {
      return <PndWorkflowsUnavailableState onRetry={onRetry} />;
    }

    return (
      <PndErrorState body={getErrorMessage(error, i18n.ERROR_BODY_FALLBACK)} onRetry={onRetry} />
    );
  }

  if (isEmpty && isAttackDiscoveryWorkflowsEnabled === false) {
    return <PndAttackDiscoveryDisabledState />;
  }

  if (isEmpty) {
    return <PndEmptyState body={emptyBody} title={emptyTitle} />;
  }

  return <>{children}</>;
};
