/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ReactNode } from 'react';
import React, { useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { EuiLink } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { useDefaultDocumentFlyoutProperties } from '../hooks/use_default_flyout_properties';
import { useOpenFlyout } from '../hooks/use_open_flyout';
import { OPEN_FLYOUT_LINK_TEST_ID } from './test_ids';
import {
  buildFlyoutContent,
  getFlyoutTypeForField,
  buildFlyoutTitleFromField,
  buildFlyoutDescriptorFromField,
} from '../utils/build_flyout_content';
import { buildFlyoutNavTitle } from '../utils/build_flyout_nav_title';
import { useFlyoutSessionContext } from '../../session_context';
import { FLYOUT_ORIGIN, FLYOUT_SESSION_KIND, FLYOUT_SURFACE } from '../../../common/lib/telemetry';
import { useFlyoutV2UrlWriter } from '../url_state/flyout_v2_url_writer';
import { urlParamKeyForHistoryKey, decodeFlyoutV2UrlParam } from '../url_state/flyout_v2_url_param';

export interface OpenFlyoutLinkProps {
  /**
   * Field name used to determine which flyout to open
   */
  field: string;
  /**
   * Field value. Used both to open the flyout and, by default, to derive its history title.
   */
  value: string;
  /**
   * Value to use for the link text and history title instead of `value`. For fields where the
   * navigation target and the display text differ (e.g. rule name links, which navigate by rule
   * UUID but display the rule name), pass the display value here so the title isn't derived from
   * the UUID.
   */
  displayValue?: string;
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
  displayValue,
  hit,
  asParent = false,
  children,
  'data-test-subj': dataTestSubj = OPEN_FLYOUT_LINK_TEST_ID,
}) => {
  const open = useOpenFlyout();
  const history = useHistory();
  const defaultDocumentFlyoutProperties = useDefaultDocumentFlyoutProperties();
  const { historyKey, session: sessionMode } = useFlyoutSessionContext();

  const flyoutContent = useMemo(() => buildFlyoutContent(field, value, hit), [field, value, hit]);
  const flyoutType = useMemo(() => getFlyoutTypeForField(field), [field]);
  const flyoutDescriptor = useMemo(
    () => buildFlyoutDescriptorFromField(field, value),
    [field, value]
  );
  const titleValue = displayValue ?? value;
  const flyoutTitle = useMemo(
    () => buildFlyoutTitleFromField(field, titleValue) ?? titleValue,
    [field, titleValue]
  );
  const urlParamKey = urlParamKeyForHistoryKey(historyKey);
  const { writeOnOpen, buildOnClose } = useFlyoutV2UrlWriter(urlParamKey, historyKey);

  const onClick = useCallback(() => {
    if (flyoutContent) {
      const resolvedSession = asParent ? FLYOUT_SESSION_KIND.START : sessionMode;
      const mode = resolvedSession === FLYOUT_SESSION_KIND.INHERIT ? 'inherit' : 'start';
      let onClose: (() => void) | undefined;
      if (flyoutDescriptor) {
        // For a child ('inherit') open, closing it must revert to the parent (the session-start
        // root), NOT clear the whole flyoutV2 param — otherwise the still-open parent tool flyout is
        // lost on refresh. Read the current root before writeOnOpen mutates the stack.
        const parentDescriptor =
          mode === 'inherit'
            ? decodeFlyoutV2UrlParam(
                new URLSearchParams(history?.location?.search ?? '').get(urlParamKey)
              )?.[0] ?? null
            : null;
        writeOnOpen(flyoutDescriptor, mode);
        onClose = buildOnClose(parentDescriptor);
      }
      open(
        flyoutContent,
        {
          ...defaultDocumentFlyoutProperties,
          historyKey,
          session: resolvedSession,
          outsideClickCloses: resolvedSession === FLYOUT_SESSION_KIND.START,
          title:
            resolvedSession === FLYOUT_SESSION_KIND.INHERIT
              ? buildFlyoutNavTitle(flyoutTitle)
              : flyoutTitle,
          ...(onClose && { onClose }),
        },
        flyoutType
          ? {
              surface: FLYOUT_SURFACE.FLYOUT,
              flyoutType,
              session: resolvedSession,
              origin: FLYOUT_ORIGIN.FLYOUT_FIELD_LINK,
            }
          : undefined,
        resolvedSession
      );
    }
  }, [
    defaultDocumentFlyoutProperties,
    open,
    flyoutContent,
    flyoutType,
    flyoutDescriptor,
    history,
    historyKey,
    urlParamKey,
    writeOnOpen,
    buildOnClose,
    asParent,
    flyoutTitle,
    sessionMode,
  ]);

  if (!flyoutContent) {
    return <>{children}</>;
  }

  return (
    <EuiLink onClick={onClick} data-test-subj={dataTestSubj}>
      {children ?? titleValue}
    </EuiLink>
  );
};
