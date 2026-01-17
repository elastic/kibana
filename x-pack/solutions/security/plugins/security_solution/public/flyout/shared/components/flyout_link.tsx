/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React, { useCallback, useMemo } from 'react';
import { EuiLink } from '@elastic/eui';
import { useFlyoutApi, useFlyoutState } from '@kbn/flyout';
import { FLYOUT_LINK_TEST_ID } from './test_ids';
import { PreviewLink } from './preview_link';
import { getChildPanelParams, getMainPanelParams } from '../utils/link_utils';

interface FlyoutLinkProps {
  /**
   * Field name
   */
  field: string;
  /**
   * Value to display in EuiLink
   */
  value: string;
  /**
   * Scope id to use for the preview panel
   */
  scopeId: string;
  /**
   * Rule id to use for the preview panel
   */
  ruleId?: string;
  /**
   * Optional data-test-subj value
   */
  ['data-test-subj']?: string;
  /**
   * React components to render, if none provided, the value will be rendered
   */
  children?: React.ReactNode;
  /**
   *
   */
  isChild: boolean;
}

/**
 * Renders a link that opens the right panel or preview panel
 * If a flyout is open, it returns the PreviewLink component
 * If a flyout is not open, the link will open the right panel
 * If the field does not have flyout, the link will not be rendered
 *
 * The flyout open determination is done via url, for expandable
 * flyout that uses in memory state, use the `isFlyoutOpen` prop.
 */
export const FlyoutLink: FC<FlyoutLinkProps> = ({
  field,
  value,
  scopeId,
  ruleId,
  children,
  isChild,
  'data-test-subj': dataTestSubj,
}) => {
  const { openMainPanel, openChildPanel } = useFlyoutApi();
  const panels = useFlyoutState();
  const renderPreview = panels.main !== undefined;

  const panelParams = useMemo(
    () =>
      isChild
        ? getChildPanelParams({
            value,
            field,
            scopeId,
            ruleId,
          })
        : getMainPanelParams({
            value,
            field,
            scopeId,
            ruleId,
          }),
    [isChild, value, field, scopeId, ruleId]
  );

  const onClick = useCallback(() => {
    if (panelParams) {
      if (!panels.child) {
        openMainPanel(
          {
            id: panelParams.id,
            params: panelParams.params,
          },
          's'
        );
      } else {
        openChildPanel(
          {
            id: panelParams.id,
            params: panelParams.params,
          },
          's'
        );
      }
    }
  }, [panelParams, panels.child, openMainPanel, openChildPanel]);

  // If the flyout is open, render the preview link
  if (renderPreview) {
    return (
      <PreviewLink
        field={field}
        value={value}
        scopeId={scopeId}
        data-test-subj={dataTestSubj}
        isChild={isChild}
      >
        {children}
      </PreviewLink>
    );
  }

  return panelParams ? (
    <EuiLink onClick={onClick} data-test-subj={dataTestSubj ?? FLYOUT_LINK_TEST_ID}>
      {children ?? value}
    </EuiLink>
  ) : (
    <>{children ?? value}</>
  );
};
