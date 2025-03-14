/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { EuiButtonIcon } from '@elastic/eui';
import type { Alert } from '@kbn/alerting-types';
import { MoreActionsRowControlColumn } from '../leading_controls/more_actions';
import { AssistantRowControlColumn } from '../leading_controls/assistant';
import { IOCPanelKey } from '../../../../flyout/ai_for_soc/constants/panel_keys';

export interface ActionsCellProps {
  /**
   *
   */
  alert: Alert;
}

export const ActionsCell = memo(({ alert }: ActionsCellProps) => {
  const { openFlyout } = useExpandableFlyoutApi();
  const onOpenFlyout = useCallback(
    () =>
      openFlyout({
        right: {
          id: IOCPanelKey,
          params: {
            eventId: alert._id,
            indexName: alert._index,
          },
        },
      }),
    [alert, openFlyout]
  );

  return (
    <>
      <EuiButtonIcon iconType="expand" onClick={onOpenFlyout} size="s" color="primary" />
      <AssistantRowControlColumn />
      <MoreActionsRowControlColumn ecs={alert} />
    </>
  );
});

ActionsCell.displayName = 'ActionsCell';
