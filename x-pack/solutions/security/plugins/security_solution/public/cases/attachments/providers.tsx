/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ReactNode } from 'react';
import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux-v7';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { RegisteredUnifiedAttachmentType } from '@kbn/cases-plugin/public';
import { TimelineId } from '../../../common/types/timeline';
import { timelineActions } from '../../timelines/store';
import { flyoutProviders } from '../../flyout_v2/shared/components/flyout_provider';
import type { SecurityCanvasEmbeddedBundle } from '../../agent_builder/components/security_redux_embedded_provider';

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
 * Gives Security's case attachment renderers the store, services, privileges, and flyouts they get
 * inside the Security app, for when they render in the top-level Cases app. Uses the same providers
 * as the Security flyout hosted in Discover.
 */
export const createCaseAttachmentProviders = (
  resolveSecurityContext: () => Promise<SecurityCanvasEmbeddedBundle>
): FC<{ children: ReactNode }> => {
  // Every attachment on a case mounts these providers; once resolved, later mounts render at once.
  let resolved: SecurityCanvasEmbeddedBundle | undefined;

  const CaseAttachmentProviders: FC<{ children: ReactNode }> = ({ children }) => {
    const [bundle, setBundle] = useState(resolved);

    useEffect(() => {
      if (bundle) {
        return;
      }
      let cancelled = false;
      void resolveSecurityContext().then((next) => {
        resolved = next;
        if (!cancelled) {
          setBundle(next);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [bundle]);

    if (!bundle) {
      return <EuiLoadingSpinner size="m" />;
    }

    return flyoutProviders({
      services: bundle.kibanaServices,
      store: bundle.store,
      children: (
        <>
          <CasePageTimeline />
          {children}
        </>
      ),
    });
  };
  CaseAttachmentProviders.displayName = 'SecurityCaseAttachmentProviders';
  return CaseAttachmentProviders;
};

export const withCaseAttachmentProviders =
  (providers: FC<{ children: ReactNode }>) =>
  <T extends RegisteredUnifiedAttachmentType>(attachmentType: T): T => ({
    ...attachmentType,
    providers,
  });
