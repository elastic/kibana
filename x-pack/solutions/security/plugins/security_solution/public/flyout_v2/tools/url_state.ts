/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { History } from 'history';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { replaceUrlQuery } from '@kbn/kibana-utils-plugin/common';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { FlowTargetSourceDest } from '../../../common/search_strategy/security_solution/network';

export const TOOL_FLYOUT_OPEN_URL_PARAM = 'securitySolutionToolFlyoutOpen';
export const TOOL_FLYOUT_STATE_URL_PARAM = 'securitySolutionToolFlyoutState';

export interface ToolFlyoutDocRef {
  documentId: string;
  indexName: string;
}

export type ToolFlyoutType =
  | 'notes'
  | 'correlations'
  | 'prevalence'
  | 'threat_intelligence'
  | 'investigation_guide'
  | 'analyzer'
  | 'session_view'
  | 'network_details';

export interface NetworkDetailsPayload {
  ip: string;
  flowTarget: FlowTargetSourceDest;
}

export interface ToolFlyoutPersistedState {
  toolType: ToolFlyoutType;
  docRef?: ToolFlyoutDocRef;
  networkDetails?: NetworkDetailsPayload;
}

export interface ToolFlyoutUrlState {
  isOpen: boolean;
  state?: ToolFlyoutPersistedState;
}

const DOC_REF_REQUIRED_TOOLS: ToolFlyoutType[] = [
  'notes',
  'correlations',
  'prevalence',
  'threat_intelligence',
  'investigation_guide',
  'analyzer',
  'session_view',
];

const getUrlStateStorage = (history: History) =>
  createKbnUrlStateStorage({
    history,
    useHash: false,
    useHashQuery: false,
  });

const isToolFlyoutDocRef = (value: unknown): value is ToolFlyoutDocRef => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const maybeRef = value as Partial<ToolFlyoutDocRef>;
  return typeof maybeRef.documentId === 'string' && typeof maybeRef.indexName === 'string';
};

const isNetworkDetailsPayload = (value: unknown): value is NetworkDetailsPayload => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const maybePayload = value as Partial<NetworkDetailsPayload>;
  return (
    typeof maybePayload.ip === 'string' &&
    (maybePayload.flowTarget === FlowTargetSourceDest.source ||
      maybePayload.flowTarget === FlowTargetSourceDest.destination)
  );
};

export const isToolFlyoutPersistedState = (value: unknown): value is ToolFlyoutPersistedState => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const maybeState = value as Partial<ToolFlyoutPersistedState>;
  const { toolType, docRef, networkDetails } = maybeState;

  if (typeof toolType !== 'string') {
    return false;
  }

  if (toolType === 'network_details') {
    return isNetworkDetailsPayload(networkDetails);
  }

  if (!DOC_REF_REQUIRED_TOOLS.includes(toolType as ToolFlyoutType)) {
    return false;
  }

  return isToolFlyoutDocRef(docRef);
};

export const getToolFlyoutDocRefFromRecord = (
  hit: DataTableRecord
): ToolFlyoutDocRef | undefined => {
  const documentId = hit.raw._id ?? (getFieldValue(hit, '_id') as string | undefined);
  const indexName = hit.raw._index ?? (getFieldValue(hit, '_index') as string | undefined);

  if (!documentId || !indexName) {
    return undefined;
  }

  return { documentId, indexName };
};

export const getToolFlyoutUrlState = (history: History): ToolFlyoutUrlState => {
  const urlStateStorage = getUrlStateStorage(history);
  const maybeState = urlStateStorage.get<unknown>(TOOL_FLYOUT_STATE_URL_PARAM);

  return {
    isOpen: urlStateStorage.get<boolean>(TOOL_FLYOUT_OPEN_URL_PARAM) === true,
    state: isToolFlyoutPersistedState(maybeState) ? maybeState : undefined,
  };
};

export const setToolFlyoutUrlState = (history: History, state: ToolFlyoutPersistedState): void => {
  const urlStateStorage = getUrlStateStorage(history);

  urlStateStorage.set(TOOL_FLYOUT_STATE_URL_PARAM, state, { replace: true });
  urlStateStorage.set(TOOL_FLYOUT_OPEN_URL_PARAM, true, { replace: false });
};

export const clearToolFlyoutUrlState = (history: History): void => {
  const urlStateStorage = getUrlStateStorage(history);

  void urlStateStorage.kbnUrlControls.updateAsync(
    (currentUrl) =>
      replaceUrlQuery(
        currentUrl,
        ({ [TOOL_FLYOUT_OPEN_URL_PARAM]: _open, [TOOL_FLYOUT_STATE_URL_PARAM]: _state, ...rest }) =>
          rest
      ),
    true
  );
};
