/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { EuiPanel, EuiTabbedContent } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ProcessEvent } from '@kbn/session-view-plugin/common';
import { useStore } from 'react-redux';
import { useHistory } from 'react-router-dom';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { ResolverCellActionRenderer } from '../../../resolver/types';
import { OverviewTabWrapper } from '../../document/tabs/overview_tab_wrapper';
import { flyoutProviders } from '../../shared/components/flyout_provider';
import { PREFIX } from '../../../flyout/shared/test_ids';
import { type CustomProcess } from '../../../flyout/document_details/session_view/context';
import { AlertsTab } from '../../../flyout/document_details/session_view/tabs/alerts_tab';
import { MetadataTab } from './metadata_tab';
import { ProcessTab } from './process_tab';
import { SessionView } from '../session_view';
import { useKibana } from '../../../common/lib/kibana';

export const SESSION_VIEW_DETAILS_TEST_ID = `${PREFIX}SessionViewDetails` as const;

export interface SessionViewDetailsProps {
  /**
   *
   */
  hit: DataTableRecord;
  /**
   *
   */
  selectedProcess: CustomProcess;
  /**
   *
   */
  index: string;
  /**
   *
   */
  sessionEntityId: string;
  /**
   *
   */
  sessionStartTime: string;
  /**
   *
   */
  investigatedAlertId: string;
  /**
   *
   */
  renderCellActions: ResolverCellActionRenderer;
}

/**
 *
 */
export const SessionViewDetails = memo(
  ({
    hit,
    selectedProcess,
    index,
    sessionEntityId,
    sessionStartTime,
    investigatedAlertId,
    renderCellActions,
  }: SessionViewDetailsProps) => {
    const { services } = useKibana();
    const { overlays } = services;
    const store = useStore();
    const history = useHistory();

    const onShowAlertDetails = useCallback(
      (alertId: string, alertIndex: string) => {
        overlays?.openSystemFlyout(
          flyoutProviders({
            services,
            store,
            history,
            children: (
              <OverviewTabWrapper
                documentId={alertId}
                indexName={alertIndex}
                renderCellActions={renderCellActions}
              />
            ),
          }),
          {
            ownFocus: false,
            resizable: true,
            session: 'inherit',
            size: 's',
          }
        );
      },
      [history, overlays, renderCellActions, services, store]
    );

    const onJumpToEvent = useCallback(
      (event: ProcessEvent) => {
        let jumpToEntityId: string | undefined;
        let jumpToCursor: string | undefined;
        if (event.process) {
          const { entity_id: entityId } = event.process;
          if (entityId !== sessionEntityId) {
            const alert = event.kibana?.alert;
            const cursor = alert ? alert?.original_time : event['@timestamp'];

            if (cursor) {
              jumpToEntityId = entityId;
              jumpToCursor = cursor;
            }
          }
        }

        overlays.openSystemFlyout(
          flyoutProviders({
            services,
            store,
            history,
            children: (
              <SessionView
                hit={hit}
                jumpToCursor={jumpToCursor}
                jumpToEntityId={jumpToEntityId}
                renderCellActions={renderCellActions}
              />
            ),
          }),
          {
            ownFocus: false,
            resizable: true,
            size: 'm',
            type: 'overlay',
          }
        );
      },
      [history, hit, overlays, renderCellActions, services, sessionEntityId, store]
    );

    const tabs = useMemo(
      () => [
        {
          id: 'process',
          name: (
            <FormattedMessage
              id="xpack.securitySolution.flyout.preview.sessionview.header.processTabLabel"
              defaultMessage="Process"
            />
          ),
          content: <ProcessTab selectedProcess={selectedProcess} index={index} />,
        },
        {
          id: 'metadata',
          name: (
            <FormattedMessage
              id="xpack.securitySolution.flyout.preview.sessionview.header.metadataTabLabel"
              defaultMessage="Metadata"
            />
          ),
          content: <MetadataTab selectedProcess={selectedProcess} />,
        },
        {
          id: 'alerts',
          name: (
            <FormattedMessage
              id="xpack.securitySolution.flyout.preview.sessionview.header.alertsTabLabel"
              defaultMessage="Alerts"
            />
          ),
          content: (
            <AlertsTab
              investigatedAlertId={investigatedAlertId}
              sessionEntityId={sessionEntityId}
              sessionStartTime={sessionStartTime}
              onJumpToEvent={onJumpToEvent}
              onShowAlertDetails={onShowAlertDetails}
            />
          ),
        },
      ],
      [
        index,
        investigatedAlertId,
        onJumpToEvent,
        onShowAlertDetails,
        selectedProcess,
        sessionEntityId,
        sessionStartTime,
      ]
    );

    return (
      <EuiPanel data-test-subj={SESSION_VIEW_DETAILS_TEST_ID}>
        <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} autoFocus="selected" />
      </EuiPanel>
    );
  }
);

SessionViewDetails.displayName = 'SessionViewDetails';
