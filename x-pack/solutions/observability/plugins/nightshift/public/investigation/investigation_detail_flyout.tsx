/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { InvestigationDetailFlyout as SharedInvestigationDetailFlyout } from '@kbn/nightshift-investigations-plugin/public';
import { useInvestigationState } from '@kbn/investigation-output';
import { useFlyoutShareUrlCustomAction } from '../common/flyout_share_url_button';
import { buildNightshiftInvestigationFlyoutShareUrl } from '../common/url_params';
import { setFlyoutMenuCloseButtonEbtProps } from '../common/flyout_close_ebt';
import { NIGHTSHIFT_EBT_ELEMENTS } from '../common/ebt_constants';
import { useFetchInvestigationById } from '../hooks/use_fetch_investigation_by_id';
import { useKibana } from '../hooks/use_kibana';

export interface InvestigationDetailFlyoutProps {
  investigationId: string;
  onClose: () => void;
}

export function InvestigationDetailFlyout({
  investigationId,
  onClose,
}: InvestigationDetailFlyoutProps): React.ReactElement {
  const { http } = useKibana().services;
  const { data: investigation, isLoading, error } = useFetchInvestigationById(investigationId);

  // Nothing is persisted on the record until the run ends, so a live run is followed through the
  // agent's own event stream. Investigation ids are workflow execution ids (see the workflow YAML,
  // which ensures the record under `execution.id`), so the id doubles as the stream key.
  const isRunning = investigation?.status === 'pending' || investigation?.status === 'running';
  const { state: progress } = useInvestigationState({
    http,
    workflowExecutionId: isRunning ? investigationId : undefined,
    isRunning,
  });

  const getShareUrl = useCallback(
    () => buildNightshiftInvestigationFlyoutShareUrl(investigationId),
    [investigationId]
  );
  const shareUrlCustomAction = useFlyoutShareUrlCustomAction(getShareUrl);
  const primaryText = investigation?.title ?? investigationId;

  return (
    <SharedInvestigationDetailFlyout
      investigation={investigation ?? null}
      isLoading={isLoading}
      error={error ?? null}
      progress={progress}
      onClose={onClose}
      flyoutMenuProps={{
        title: primaryText,
        hideTitle: true,
        customActions: [shareUrlCustomAction],
      }}
      onClickCapture={(clickEvent) =>
        setFlyoutMenuCloseButtonEbtProps(
          clickEvent,
          NIGHTSHIFT_EBT_ELEMENTS.INVESTIGATION_DETAIL_FLYOUT
        )
      }
    />
  );
}
