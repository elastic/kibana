/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ReactNode } from 'react';
import React, { useEffect, useState } from 'react';
import { useDispatch, useStore } from 'react-redux-v7';
import { EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RegisteredUnifiedAttachmentType } from '@kbn/cases-plugin/public';
import { TimelineId } from '../../../common/types/timeline';
import { timelineActions } from '../../timelines/store';
import type { State } from '../../common/store/types';
import { flyoutProviders } from '../../flyout_v2/shared/components/flyout_provider';
import type { SecurityCanvasEmbeddedBundle } from '../../agent_builder/components/security_redux_embedded_provider';

// The Security Cases page creates this timeline on mount; attachment renderers read from it.
const CasePageTimeline: FC = () => {
  const dispatch = useDispatch();
  const store = useStore<State>();
  useEffect(() => {
    // Every Security attachment mounts its own providers; only the first creates the timeline.
    if (store.getState().timeline.timelineById[TimelineId.casePage]) {
      return;
    }
    dispatch(
      timelineActions.createTimeline({
        id: TimelineId.casePage,
        columns: [],
        dataViewId: null,
        indexNames: [],
        show: false,
      })
    );
  }, [dispatch, store]);
  return null;
};

const LOAD_ERROR = i18n.translate('xpack.securitySolution.cases.attachments.providers.loadError', {
  defaultMessage: "This attachment couldn't load. Refresh the page to try again.",
});

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
    const [failed, setFailed] = useState(false);

    useEffect(() => {
      if (bundle) {
        return;
      }
      let cancelled = false;
      resolveSecurityContext().then(
        (next) => {
          resolved = next;
          if (!cancelled) {
            setBundle(next);
          }
        },
        () => {
          if (!cancelled) {
            setFailed(true);
          }
        }
      );
      return () => {
        cancelled = true;
      };
    }, [bundle]);

    if (failed) {
      return (
        <EuiText size="s" color="subdued">
          {LOAD_ERROR}
        </EuiText>
      );
    }

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
