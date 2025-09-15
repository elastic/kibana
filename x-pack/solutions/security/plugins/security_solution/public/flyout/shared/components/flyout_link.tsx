/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React, { useCallback, useMemo } from 'react';
import { EuiLink } from '@elastic/eui';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useKibana } from '../../../common/lib/kibana';
import { FLYOUT_LINK_TEST_ID } from './test_ids';
import { DocumentEventTypes } from '../../../common/lib/telemetry';
import { PreviewLink } from './preview_link';
import { getRightPanelParams } from '../utils/link_utils';
import { useWhichFlyout } from '../../document_details/shared/hooks/use_which_flyout';

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
   * Optional override to determine if the flyout is open
   */
  isFlyoutOpen?: boolean;
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
  isFlyoutOpen = false,
  ruleId,
  children,
  'data-test-subj': dataTestSubj,
}) => {
  const { openFlyout } = useExpandableFlyoutApi();
  const { telemetry } = useKibana().services;
  const whichFlyout = useWhichFlyout();
  const renderPreview = isFlyoutOpen || whichFlyout !== null;

  const rightPanelParams = useMemo(
    () =>
      getRightPanelParams({
        value,
        field,
        scopeId,
        ruleId,
      }),
    [value, field, scopeId, ruleId]
  );

  const onClick = useCallback(() => {
    if (rightPanelParams) {
      openFlyout({
        right: {
          id: rightPanelParams.id,
          params: rightPanelParams.params,
        },
      });
      telemetry.reportEvent(DocumentEventTypes.DetailsFlyoutOpened, {
        location: scopeId,
        panel: 'right',
      });
    }
  }, [rightPanelParams, scopeId, telemetry, openFlyout]);

  // If the flyout is open, render the preview link
  if (renderPreview) {
    return (
      <PreviewLink field={field} value={value} scopeId={scopeId} data-test-subj={dataTestSubj}>
        {children}
      </PreviewLink>
    );
  }

  return rightPanelParams ? (
    <EuiLink onClick={onClick} data-test-subj={dataTestSubj ?? FLYOUT_LINK_TEST_ID}>
      {children ?? value}
    </EuiLink>
  ) : (
    <>{children ?? value}</>
  );
};
