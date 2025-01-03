/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, memo, useContext, useMemo } from 'react';
import type { ProcessEvent } from '@kbn/session-view-plugin/common';
import { FlyoutError } from '../../shared/components/flyout_error';
import type { SessionViewPanelProps } from '.';

export interface CustomProcess {
  /**
   * Id of the process
   */
  id: string;
  /**
   * Details of the process (see implementation under getDetailsMemo here: x-pack/plugins/session_view/public/components/process_tree/hooks.ts)
   */
  details: ProcessEvent;
  /**
   * Timestamp of the 'end' event (see implementation under getEndTime here x-pack/plugins/session_view/public/components/process_tree/hooks.ts)
   */
  endTime: string;
}

export interface SessionViewPanelContext {
  /**
   * Id of the document that was initially being investigated in the expandable flyout.
   * This context needs to store it as it is used within the SessionView preview panel to be able to reopen the left panel with the same document.
   */
  eventId: string;
  /**
   * Index used when investigating the initial document in the expandable flyout.
   * This context needs to store it as it is used within the SessionView preview panel to be able to reopen the left panel with the same document.
   */
  indexName: string;
  /**
   * ScopeId used when investigating the initial document in the expandable flyout.
   * This context needs to store it as it is used within the SessionView preview panel to be able to reopen the left panel with the same document.
   */
  scopeId: string;
  /**
   * Store a subset of properties from the SessionView component.
   * The original object had functions as well as recursive properties, which we should not store in the context.
   */
  selectedProcess: CustomProcess | null;
  /**
   * index used within the SessionView component
   */
  index: string;
  /**
   * sessionEntityId value used to correctly render the SessionView component
   */
  sessionEntityId: string;
  /**
   * sessionStartTime value used to correctly render the SessionView component
   */
  sessionStartTime: string;
  /**
   * investigatedAlertId value used to correctly render the SessionView component
   */
  investigatedAlertId: string;
}

export const SessionViewPanelContext = createContext<SessionViewPanelContext | undefined>(
  undefined
);

export type SessionViewPanelProviderProps = {
  /**
   * React components to render
   */
  children: React.ReactNode;
} & Partial<SessionViewPanelProps['params']>;

export const SessionViewPanelProvider = memo(
  ({
    eventId,
    indexName,
    selectedProcess,
    index,
    sessionEntityId,
    sessionStartTime,
    scopeId,
    investigatedAlertId,
    children,
  }: SessionViewPanelProviderProps) => {
    const contextValue = useMemo(
      () =>
        eventId &&
        indexName &&
        selectedProcess &&
        index &&
        sessionEntityId &&
        sessionStartTime &&
        scopeId &&
        investigatedAlertId
          ? {
              eventId,
              indexName,
              selectedProcess,
              index,
              sessionEntityId,
              sessionStartTime,
              scopeId,
              investigatedAlertId,
            }
          : undefined,
      [
        eventId,
        indexName,
        selectedProcess,
        index,
        sessionEntityId,
        sessionStartTime,
        scopeId,
        investigatedAlertId,
      ]
    );

    if (!contextValue) {
      return <FlyoutError />;
    }

    return (
      <SessionViewPanelContext.Provider value={contextValue}>
        {children}
      </SessionViewPanelContext.Provider>
    );
  }
);

SessionViewPanelProvider.displayName = 'SessionViewPanelProvider';

export const useSessionViewPanelContext = (): SessionViewPanelContext => {
  const contextValue = useContext(SessionViewPanelContext);

  if (!contextValue) {
    throw new Error(
      'SessionViewPanelContext can only be used within SessionViewPanelContext provider'
    );
  }

  return contextValue;
};
