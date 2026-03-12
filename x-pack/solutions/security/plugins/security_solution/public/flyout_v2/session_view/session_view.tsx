/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useCallback } from 'react';
import { type DataTableRecord } from '@kbn/discover-utils';
import type { Process } from '@kbn/session-view-plugin/common';
import { useHistory } from 'react-router-dom';
import { useStore } from 'react-redux';
import { OverviewTabWrapper } from '../document/tabs/overview_tab_wrapper';
import type { ResolverCellActionRenderer } from '../../resolver/types';
import { PREFIX } from '../../flyout/shared/test_ids';
import { useUserPrivileges } from '../../common/components/user_privileges';
import { useKibana } from '../../common/lib/kibana';
import { useSessionViewConfig } from '../document/hooks/use_session_view_config';
import type { CustomProcess } from '../../flyout/document_details/session_view/context';
import { flyoutProviders } from '../shared/components/flyout_provider';
import { SessionViewDetails } from './components/session_view_details';

export const SESSION_VIEW_TEST_ID = `${PREFIX}SessionView` as const;

const EUI_HEADER_HEIGHT = 96;
const EXPANDABLE_FLYOUT_LEFT_SECTION_HEADER_HEIGHT = 72;
const VISUALIZE_WRAPPER_PADDING = 16;
const VISUALIZE_BUTTON_GROUP_HEIGHT = 32;
const EUI_SPACER_HEIGHT = 16;
const SESSION_VIEW_SEARCH_BAR_HEIGHT = 64;

export interface SessionViewProps {
  /**
   * Alert document
   */
  hit: DataTableRecord;
  /**
   *
   */
  jumpToEntityId?: string;
  /**
   *
   */
  jumpToCursor?: string;
  /**
   *
   */
  renderCellActions: ResolverCellActionRenderer;
}

/**
 * Session view displayed in the document details expandable flyout left section under the Visualize tab
 */
export const SessionView: FC<SessionViewProps> = memo(
  ({ hit, jumpToEntityId, jumpToCursor, renderCellActions }) => {
    const { services } = useKibana();
    const { overlays, sessionView } = services;
    const store = useStore();
    const history = useHistory();

    const { canReadPolicyManagement } = useUserPrivileges().endpointPrivileges;

    const sessionViewConfig = useSessionViewConfig(hit);

    const openAlertDetails = useCallback(
      (alertId: string, alertIndex: string, onClose?: () => void) => {
        // In the SessionView component, when the user clicks on the
        // expand button to open a alert in the child panel, this actually also selects the row and opens
        // the detailed panel in preview.
        // In order to NOT modify the SessionView code, the setTimeout here guarantees that the alert details preview
        // will be opened in second, so that we have a correct order in the opened preview panels
        setTimeout(() => {
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
        }, 100);
      },
      [history, overlays, renderCellActions, services, store]
    );

    const openDetails = useCallback(
      (selectedProcess: Process | null) => {
        // We cannot pass the original Process object sent from the SessionView component
        // as it contains functions (that should not put into Redux)
        // and also some recursive properties (that will break rison.encode when updating the URL)
        const simplifiedSelectedProcess: CustomProcess | null = selectedProcess
          ? {
              id: selectedProcess.id,
              details: selectedProcess.getDetails(),
              endTime: selectedProcess.getEndTime(),
            }
          : null;

        if (
          !simplifiedSelectedProcess ||
          !sessionViewConfig?.index ||
          !sessionViewConfig?.sessionEntityId ||
          !sessionViewConfig?.sessionStartTime ||
          !sessionViewConfig?.investigatedAlertId
        ) {
          return;
        }

        overlays.openSystemFlyout(
          flyoutProviders({
            services,
            store,
            history,
            children: (
              <SessionViewDetails
                hit={hit}
                selectedProcess={simplifiedSelectedProcess}
                index={sessionViewConfig.index}
                sessionEntityId={sessionViewConfig.sessionEntityId}
                sessionStartTime={sessionViewConfig.sessionStartTime}
                investigatedAlertId={sessionViewConfig.investigatedAlertId}
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
      [
        history,
        hit,
        overlays,
        renderCellActions,
        services,
        sessionViewConfig.index,
        sessionViewConfig.investigatedAlertId,
        sessionViewConfig.sessionEntityId,
        sessionViewConfig.sessionStartTime,
        store,
      ]
    );

    const closeDetails = useCallback(() => {
      // TODO implement
    }, []);

    const height =
      window.innerHeight -
      EUI_HEADER_HEIGHT -
      EXPANDABLE_FLYOUT_LEFT_SECTION_HEADER_HEIGHT -
      2 * VISUALIZE_WRAPPER_PADDING -
      VISUALIZE_BUTTON_GROUP_HEIGHT -
      EUI_SPACER_HEIGHT -
      SESSION_VIEW_SEARCH_BAR_HEIGHT;

    return (
      <div data-test-subj={SESSION_VIEW_TEST_ID}>
        {sessionView.getSessionView({
          ...sessionViewConfig,
          height,
          isFullScreen: true,
          loadAlertDetails: openAlertDetails,
          openDetails: (selectedProcess: Process | null) => openDetails(selectedProcess),
          closeDetails: () => closeDetails(),
          canReadPolicyManagement,
          resetJumpToEntityId: jumpToEntityId,
          resetJumpToCursor: jumpToCursor,
        })}
      </div>
    );
  }
);

SessionView.displayName = 'SessionView';
