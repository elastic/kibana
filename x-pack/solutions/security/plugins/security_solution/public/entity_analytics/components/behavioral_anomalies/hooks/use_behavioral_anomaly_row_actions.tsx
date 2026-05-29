/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { IconType } from '@elastic/eui';
import { encode } from '@kbn/rison';
import type { CaseAttachmentsWithoutOwner } from '@kbn/cases-plugin/public';
import { APP_ID } from '../../../../../common';
import { useKibana } from '../../../../common/lib/kibana';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useInvestigateInTimeline } from '../../../../common/hooks/timeline/use_investigate_in_timeline';
import { generateEventAttachmentWithoutOwner } from '../../../../cases/attachments/event/utils';
import { BEHAVIORAL_ANOMALIES_TIME_RANGE } from '../constants';
import type { BehavioralAnomalyTableRow } from '../types';
import {
  ANOMALIES_TABLE_ROW_ACTION_ADD_TO_CASE,
  ANOMALIES_TABLE_ROW_ACTION_ADD_TO_CHAT,
  ANOMALIES_TABLE_ROW_ACTION_ADD_TO_TIMELINE,
  ANOMALIES_TABLE_ROW_ACTION_VIEW_IN_DISCOVER,
  ANOMALIES_TABLE_ROW_ACTION_VIEW_IN_SMV,
} from '../translations';
import {
  BEHAVIORAL_ANOMALIES_TABLE_ROW_ACTION_ADD_TO_CASE_TEST_ID,
  BEHAVIORAL_ANOMALIES_TABLE_ROW_ACTION_ADD_TO_CHAT_TEST_ID,
  BEHAVIORAL_ANOMALIES_TABLE_ROW_ACTION_ADD_TO_TIMELINE_TEST_ID,
  BEHAVIORAL_ANOMALIES_TABLE_ROW_ACTION_VIEW_IN_DISCOVER_TEST_ID,
  BEHAVIORAL_ANOMALIES_TABLE_ROW_ACTION_VIEW_IN_SMV_TEST_ID,
} from '../test_ids';
import { useAnomalySingleMetricViewerUrl } from './use_anomaly_single_metric_viewer_url';

export interface BehavioralAnomalyRowAction {
  key: string;
  label: string;
  icon: IconType;
  onClick: () => void;
  dataTestSubj: string;
}

export interface BehavioralAnomalyAddToChat {
  label: string;
  onClick: () => void;
  dataTestSubj: string;
}

export interface BehavioralAnomalyRowActionsResult {
  actions: BehavioralAnomalyRowAction[];
  addToChat: BehavioralAnomalyAddToChat;
}

interface UseBehavioralAnomalyRowActionsArgs {
  row: BehavioralAnomalyTableRow;
  closePopover: () => void;
}

/** Build a KQL expression matching the underlying event ids of a row. */
const buildEventIdsKql = (row: BehavioralAnomalyTableRow): string => {
  const ids = row.underlyingEvents.map((event) => `"${event._id}"`);
  return ids.length > 0 ? `_id: (${ids.join(' OR ')})` : '';
};

/**
 * Per-row action handlers for the Behavioral anomalies table.
 *
 * Returns the standard panel `actions` (case / timeline / discover / SMV) and a
 * separate `addToChat` descriptor so the popover can render the AI assistant
 * affordance with its own visual treatment.
 *
 * Prototype only: handlers wire to existing Security Solution flows
 * (cases modal, timeline, Discover, ML Single metric viewer). Attachments succeed
 * only when the underlying mock event documents exist in the user's cluster.
 */
export const useBehavioralAnomalyRowActions = ({
  row,
  closePopover,
}: UseBehavioralAnomalyRowActionsArgs): BehavioralAnomalyRowActionsResult => {
  const { services } = useKibana();
  const { cases: casesUi, application, ml } = services;
  const {
    timelinePrivileges: { read: canReadTimeline },
  } = useUserPrivileges();

  const casesPermissions = casesUi.helpers.canUseCases([APP_ID]);
  const canAddToCase = casesPermissions.createComment && casesPermissions.read;

  const caseAttachments = useMemo<CaseAttachmentsWithoutOwner>(
    () =>
      row.underlyingEvents
        .map((event) =>
          generateEventAttachmentWithoutOwner({
            attachmentId: event._id,
            index: event._index,
          })
        )
        .filter((attachment): attachment is NonNullable<typeof attachment> => attachment != null),
    [row.underlyingEvents]
  );

  const selectCaseModal = casesUi.hooks.useCasesAddToExistingCaseModal({
    onClose: closePopover,
  });

  const handleAddToCase = useCallback(() => {
    closePopover();
    selectCaseModal.open({
      getAttachments: () => caseAttachments,
    });
  }, [caseAttachments, closePopover, selectCaseModal]);

  const { investigateInTimeline } = useInvestigateInTimeline();

  const handleAddToTimeline = useCallback(() => {
    closePopover();
    const expression = buildEventIdsKql(row);
    if (!expression) {
      return;
    }
    investigateInTimeline({
      query: { language: 'kuery', query: expression },
      timeRange: {
        kind: 'relative',
        fromStr: BEHAVIORAL_ANOMALIES_TIME_RANGE.from,
        toStr: BEHAVIORAL_ANOMALIES_TIME_RANGE.to,
        from: BEHAVIORAL_ANOMALIES_TIME_RANGE.from,
        to: BEHAVIORAL_ANOMALIES_TIME_RANGE.to,
      },
    });
  }, [closePopover, investigateInTimeline, row]);

  const discoverUrl = useMemo(() => {
    const expression = buildEventIdsKql(row);
    const encodedAppState = encode({
      query: { language: 'kuery', query: expression },
    });
    return application.getUrlForApp('discover', {
      path: `#/?_a=${encodedAppState}`,
    });
  }, [application, row]);

  const handleViewInDiscover = useCallback(() => {
    closePopover();
    window.open(discoverUrl, '_blank', 'noopener,noreferrer');
  }, [closePopover, discoverUrl]);

  const singleMetricViewerUrl = useAnomalySingleMetricViewerUrl(row);

  const handleViewInSingleMetricViewer = useCallback(() => {
    closePopover();
    if (singleMetricViewerUrl) {
      window.open(singleMetricViewerUrl, '_blank', 'noopener,noreferrer');
    }
  }, [closePopover, singleMetricViewerUrl]);

  const handleAddToChat = useCallback(() => {
    closePopover();
  }, [closePopover]);

  const actions = useMemo(() => {
    const items: BehavioralAnomalyRowAction[] = [];

    if (canAddToCase) {
      items.push({
        key: 'add-to-case',
        label: ANOMALIES_TABLE_ROW_ACTION_ADD_TO_CASE,
        icon: 'briefcase',
        onClick: handleAddToCase,
        dataTestSubj: BEHAVIORAL_ANOMALIES_TABLE_ROW_ACTION_ADD_TO_CASE_TEST_ID,
      });
    }

    if (canReadTimeline) {
      items.push({
        key: 'add-to-timeline',
        label: ANOMALIES_TABLE_ROW_ACTION_ADD_TO_TIMELINE,
        icon: 'timeline',
        onClick: handleAddToTimeline,
        dataTestSubj: BEHAVIORAL_ANOMALIES_TABLE_ROW_ACTION_ADD_TO_TIMELINE_TEST_ID,
      });
    }

    items.push({
      key: 'view-in-discover',
      label: ANOMALIES_TABLE_ROW_ACTION_VIEW_IN_DISCOVER,
      icon: 'productDiscover',
      onClick: handleViewInDiscover,
      dataTestSubj: BEHAVIORAL_ANOMALIES_TABLE_ROW_ACTION_VIEW_IN_DISCOVER_TEST_ID,
    });

    if (ml && singleMetricViewerUrl) {
      items.push({
        key: 'view-in-single-metric-viewer',
        label: ANOMALIES_TABLE_ROW_ACTION_VIEW_IN_SMV,
        icon: 'singleMetricViewer',
        onClick: handleViewInSingleMetricViewer,
        dataTestSubj: BEHAVIORAL_ANOMALIES_TABLE_ROW_ACTION_VIEW_IN_SMV_TEST_ID,
      });
    }

    return items;
  }, [
    canAddToCase,
    canReadTimeline,
    handleAddToCase,
    handleAddToTimeline,
    handleViewInDiscover,
    handleViewInSingleMetricViewer,
    ml,
    singleMetricViewerUrl,
  ]);

  const addToChat = useMemo<BehavioralAnomalyAddToChat>(
    () => ({
      label: ANOMALIES_TABLE_ROW_ACTION_ADD_TO_CHAT,
      onClick: handleAddToChat,
      dataTestSubj: BEHAVIORAL_ANOMALIES_TABLE_ROW_ACTION_ADD_TO_CHAT_TEST_ID,
    }),
    [handleAddToChat]
  );

  return useMemo(() => ({ actions, addToChat }), [actions, addToChat]);
};
