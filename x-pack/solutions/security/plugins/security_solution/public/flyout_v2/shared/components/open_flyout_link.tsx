/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ReactNode } from 'react';
import React, { useCallback, useMemo } from 'react';
import { EuiLink } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { useStore } from 'react-redux';
import type { DataTableRecord } from '@kbn/discover-utils';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import { flyoutProviders } from './flyout_provider';
import { useDefaultDocumentFlyoutProperties } from '../hooks/use_default_flyout_properties';
import { useKibana } from '../../../common/lib/kibana';
import { useIsInSecurityApp } from '../../../common/hooks/is_in_security_app';
import { documentFlyoutHistoryKey } from '../constants/flyout_history';
import { OPEN_FLYOUT_LINK_TEST_ID } from './test_ids';
import { buildFlyoutContent } from '../utils/build_flyout_content';
import { FlyoutSessionContextProvider, useFlyoutSessionContext } from '../../session_context';

export interface OpenFlyoutLinkProps {
  /**
   * Field name used to determine which flyout to open
   */
  field: string;
  /**
   * Field value
   */
  value: string;
  /**
   * The source document record. When provided, enables entity resolution for host/user flyouts.
   */
  hit?: DataTableRecord;
  /**
   * Optional override to force opening as a new top-level flyout (`session: 'start'`).
   * By default, the link inherits the current main-flyout session mode.
   */
  asParent?: boolean;
  /**
   * Optional data-test-subj value
   */
  ['data-test-subj']?: string;
  /**
   * React children to render inside the link. Falls back to value if not provided.
   */
  children?: ReactNode;
}

/**
 * Wrapper that renders a preview link for supported field types (host, ip, rule). Injected by
 * each flyout context so it controls its own navigation (e.g. `OpenFlyoutLink` in the new flyout).
 */
export type OpenFlyoutLinkRenderer = FC<OpenFlyoutLinkProps>;

/**
 * Renders a clickable link that opens a system flyout for supported field types.
 *
 * When the field is supported, the link is rendered with `value` as the link text.
 * When the field is not supported, the `children` are rendered as-is (pass-through),
 * allowing callers to wrap fallback rendering inside this component.
 */
export const OpenFlyoutLink: FC<OpenFlyoutLinkProps> = ({
  field,
  value,
  hit,
  asParent = false,
  children,
  'data-test-subj': dataTestSubj = OPEN_FLYOUT_LINK_TEST_ID,
}) => {
  const { services } = useKibana();
  const { overlays } = services;
  const store = useStore();
  const history = useHistory();
  const defaultDocumentFlyoutProperties = useDefaultDocumentFlyoutProperties();
  const isInSecurityApp = useIsInSecurityApp();
  const historyKey = isInSecurityApp ? documentFlyoutHistoryKey : DOC_VIEWER_FLYOUT_HISTORY_KEY;
  const mainFlyoutSessionMode = useFlyoutSessionContext();

  const flyoutContent = useMemo(() => buildFlyoutContent(field, value, hit), [field, value, hit]);

  const onClick = useCallback(() => {
    if (flyoutContent) {
      const resolvedSession = asParent ? 'start' : mainFlyoutSessionMode;
      overlays.openSystemFlyout(
        flyoutProviders({
          services,
          store,
          history,
          children: (
            <FlyoutSessionContextProvider value={resolvedSession}>
              {flyoutContent}
            </FlyoutSessionContextProvider>
          ),
        }),
        {
          ...defaultDocumentFlyoutProperties,
          historyKey,
          session: resolvedSession,
          outsideClickCloses: resolvedSession === 'start',
        }
      );
    }
  }, [
    defaultDocumentFlyoutProperties,
    history,
    flyoutContent,
    historyKey,
    mainFlyoutSessionMode,
    overlays,
    services,
    store,
    asParent,
  ]);

  if (!flyoutContent) {
    return <>{children}</>;
  }

  return (
    <EuiLink onClick={onClick} data-test-subj={dataTestSubj}>
      {children ?? value}
    </EuiLink>
  );
};
