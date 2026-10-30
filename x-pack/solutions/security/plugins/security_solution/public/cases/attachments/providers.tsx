/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ReactNode } from 'react';
import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux-v7';
import type { RegisteredUnifiedAttachmentType } from '@kbn/cases-plugin/public';
import { TimelineId } from '../../../common/types/timeline';
import { timelineActions } from '../../timelines/store';
import {
  SecurityReduxEmbeddedProvider,
  type SecurityCanvasEmbeddedBundle,
} from '../../agent_builder/components/security_redux_embedded_provider';

// The Security Cases page creates this timeline on mount; attachment renderers read from it.
const CasePageTimeline: FC = () => {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(
      timelineActions.createTimeline({
        id: TimelineId.casePage,
        columns: [],
        dataViewId: null,
        indexNames: [],
        show: false,
      })
    );
  }, [dispatch]);
  return null;
};

/**
 * Gives Security's case attachment renderers the store, services, and flyout they get inside the
 * Security app, for when they render in the top-level Cases app.
 */
export const createCaseAttachmentProviders = (
  resolveSecurityContext: () => Promise<SecurityCanvasEmbeddedBundle>
): FC<{ children: ReactNode }> => {
  const CaseAttachmentProviders: FC<{ children: ReactNode }> = ({ children }) => (
    <SecurityReduxEmbeddedProvider resolveCanvasContext={resolveSecurityContext}>
      <CasePageTimeline />
      {children}
    </SecurityReduxEmbeddedProvider>
  );
  CaseAttachmentProviders.displayName = 'SecurityCaseAttachmentProviders';
  return CaseAttachmentProviders;
};

export const withCaseAttachmentProviders =
  (providers: FC<{ children: ReactNode }>) =>
  <T extends RegisteredUnifiedAttachmentType>(attachmentType: T): T => ({
    ...attachmentType,
    providers,
  });
