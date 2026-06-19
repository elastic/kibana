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
import { flyoutProviders } from './flyout_provider';
import { useDefaultDocumentFlyoutProperties } from '../hooks/use_default_flyout_properties';
import { useKibana } from '../../../common/lib/kibana';
import { CHILD_LINK_TEST_ID } from './test_ids';
import { buildFlyoutContent } from '../utils/build_flyout_content';

export interface ChildLinkProps {
  /**
   * Field name used to determine which flyout to open
   */
  field: string;
  /**
   * Field value
   */
  value: string;
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
 * Renders a clickable link that opens a system flyout for supported field types.
 * Currently supports IP fields (opens the network details flyout).
 *
 * When the field is supported, the link is rendered with `value` as the link text.
 * When the field is not supported, the `children` are rendered as-is (pass-through),
 * allowing callers to wrap fallback rendering inside this component.
 */
export const ChildLink: FC<ChildLinkProps> = ({
  field,
  value,
  children,
  'data-test-subj': dataTestSubj = CHILD_LINK_TEST_ID,
}) => {
  const { services } = useKibana();
  const { overlays } = services;
  const store = useStore();
  const history = useHistory();
  const defaultDocumentFlyoutProperties = useDefaultDocumentFlyoutProperties();

  const flyoutContent = useMemo(() => buildFlyoutContent(field, value), [field, value]);

  const onClick = useCallback(() => {
    if (flyoutContent) {
      overlays.openSystemFlyout(
        flyoutProviders({
          services,
          store,
          history,
          children: flyoutContent,
        }),
        {
          ...defaultDocumentFlyoutProperties,
          session: 'inherit',
        }
      );
    }
  }, [defaultDocumentFlyoutProperties, overlays, services, store, history, flyoutContent]);

  if (!flyoutContent) {
    return <>{children}</>;
  }

  return (
    <EuiLink onClick={onClick} data-test-subj={dataTestSubj}>
      {children ?? value}
    </EuiLink>
  );
};
