/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt, EuiLoadingSpinner } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import {
  ENTITY_INVENTORY_EBT_ACTIONS,
  ENTITY_INVENTORY_EBT_ELEMENTS,
} from '../../../ebt_constants';
import {
  EMPTY_BODY,
  EMPTY_WITH_FAILURES_BODY,
  LOADING_ENTITIES_LABEL,
  LOAD_ERROR_TITLE,
  RETRY_LABEL,
  getEmptyTitle,
  getEmptyWithFailuresTitle,
  getTypeNotAvailableTitle,
} from './translations';

/** Shown while the first load of a type is running. */
export const EntityTableLoading = () => (
  <EuiEmptyPrompt
    icon={<EuiLoadingSpinner size="xl" />}
    title={<h2>{LOADING_ENTITIES_LABEL}</h2>}
    data-test-subj="entityInventoryTableLoading"
  />
);

/** Shown when the inventory does not know the requested entity type. */
export const EntityTableTypeNotAvailable = ({ entityType }: { entityType: string }) => (
  <EuiEmptyPrompt
    iconType="magnify"
    title={<h2>{getTypeNotAvailableTitle(entityType)}</h2>}
    data-test-subj="entityInventoryTypeNotAvailable"
  />
);

export interface EntityTableLoadErrorProps {
  entityType: string;
  message: string;
  onRetry: () => void;
}

/** Shown when a request failed, with a way to try again. */
export const EntityTableLoadError = ({
  entityType,
  message,
  onRetry,
}: EntityTableLoadErrorProps) => (
  <EuiEmptyPrompt
    color="danger"
    iconType="warning"
    title={<h2>{LOAD_ERROR_TITLE}</h2>}
    body={<p>{message}</p>}
    actions={
      <EuiButton
        color="danger"
        onClick={onRetry}
        data-test-subj="entityInventoryTableRetry"
        {...getEbtProps({
          action: ENTITY_INVENTORY_EBT_ACTIONS.RETRY_LOAD,
          element: ENTITY_INVENTORY_EBT_ELEMENTS.ENTITY_TABLE,
          detail: entityType,
        })}
      >
        {RETRY_LABEL}
      </EuiButton>
    }
    data-test-subj="entityInventoryTableError"
  />
);

export interface EntityTableEmptyProps {
  typeName: string;
  /** The response could not confirm that nothing matched: a source failed. */
  isIncomplete: boolean;
}

/**
 * Shown when no entities came back. A time range hint only fits a complete response; after a
 * failed source the entities may exist, so the text points at the failure instead.
 */
export const EntityTableEmpty = ({ typeName, isIncomplete }: EntityTableEmptyProps) => (
  <EuiEmptyPrompt
    iconType="magnify"
    title={<h2>{isIncomplete ? getEmptyWithFailuresTitle(typeName) : getEmptyTitle(typeName)}</h2>}
    body={<p>{isIncomplete ? EMPTY_WITH_FAILURES_BODY : EMPTY_BODY}</p>}
    data-test-subj="entityInventoryTableEmpty"
  />
);
