/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import {
  LazySavedObjectSaveModalDashboard,
  SaveModalDashboardProps,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useSelector } from 'react-redux';
import { OverviewStatsEmbeddableCustomState } from '../../../../embeddables/stats_overview/stats_overview_embeddable_factory';
import { ClientPluginsStart } from '../../../../../plugin';
import {
  SYNTHETICS_MONITORS_EMBEDDABLE,
  SYNTHETICS_STATS_OVERVIEW_EMBEDDABLE,
} from '../../../../embeddables/constants';
import { selectOverviewState } from '../../../state';
import { OverviewMonitorsEmbeddableCustomState } from '../../../../embeddables/monitors_overview/monitors_embeddable_factory';

const SavedObjectSaveModalDashboard = withSuspense(LazySavedObjectSaveModalDashboard);

export const useAddToDashboard = ({
  type,
  embeddableInput = {},
  objectType = i18n.translate('xpack.synthetics.item.actions.addToDashboard.objectTypeLabel', {
    defaultMessage: 'Status Overview',
  }),
  documentTitle = i18n.translate('xpack.synthetics.item.actions.addToDashboard.attachmentTitle', {
    defaultMessage: 'Status Overview',
  }),
}: {
  objectType?: string;
  documentTitle?: string;
} & (
  | {
      type: typeof SYNTHETICS_STATS_OVERVIEW_EMBEDDABLE;
      embeddableInput?: OverviewStatsEmbeddableCustomState;
    }
  | {
      type: typeof SYNTHETICS_MONITORS_EMBEDDABLE;
      embeddableInput?: OverviewMonitorsEmbeddableCustomState;
    }
)) => {
  const [isDashboardAttachmentReady, setDashboardAttachmentReady] = React.useState(false);

  const { embeddable } = useKibana<ClientPluginsStart>().services;

  const handleAttachToDashboardSave: SaveModalDashboardProps['onSave'] = useCallback(
    ({ dashboardId }) => {
      const stateTransfer = embeddable.getStateTransfer();

      const state = {
        serializedState: { rawState: embeddableInput },
        type,
      };

      const path = dashboardId === 'new' ? '#/create' : `#/view/${dashboardId}`;

      stateTransfer.navigateToWithEmbeddablePackage('dashboards', {
        state,
        path,
      });
    },
    [embeddable, type, embeddableInput]
  );

  const MaybeSavedObjectSaveModalDashboard = isDashboardAttachmentReady ? (
    <SavedObjectSaveModalDashboard
      objectType={objectType}
      documentInfo={{
        title: documentTitle,
      }}
      canSaveByReference={false}
      onClose={() => {
        setDashboardAttachmentReady(false);
      }}
      onSave={handleAttachToDashboardSave}
    />
  ) : null;

  return { setDashboardAttachmentReady, MaybeSavedObjectSaveModalDashboard };
};

export const AddToDashboard = ({
  type,
  asButton = false,
}: {
  type: typeof SYNTHETICS_STATS_OVERVIEW_EMBEDDABLE | typeof SYNTHETICS_MONITORS_EMBEDDABLE;
  asButton?: boolean;
}) => {
  const { view } = useSelector(selectOverviewState);

  const { setDashboardAttachmentReady, MaybeSavedObjectSaveModalDashboard } = useAddToDashboard(
    type === SYNTHETICS_STATS_OVERVIEW_EMBEDDABLE ? { type } : { type, embeddableInput: { view } }
  );

  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const isSyntheticsApp = window.location.pathname.includes('/app/synthetics');

  if (!isSyntheticsApp) {
    return null;
  }

  return (
    <>
      {asButton ? (
        <EuiButtonEmpty
          size="xs"
          color="primary"
          data-test-subj="syntheticsEmbeddablePanelWrapperButton"
          iconType="dashboardApp"
          onClick={() => setDashboardAttachmentReady(true)}
        >
          {i18n.translate('xpack.synthetics.embeddablePanelWrapper.shareButtonLabel', {
            defaultMessage: 'Add to dashboard',
          })}
        </EuiButtonEmpty>
      ) : (
        <EuiPopover
          button={
            <EuiButtonIcon
              color="text"
              data-test-subj="syntheticsEmbeddablePanelWrapperButton"
              iconType="boxesHorizontal"
              onClick={() => setIsPopoverOpen(!isPopoverOpen)}
              aria-label={i18n.translate(
                'xpack.synthetics.embeddablePanelWrapper.shareButtonAriaLabel',
                {
                  defaultMessage: 'Add to dashboard',
                }
              )}
            />
          }
          isOpen={isPopoverOpen}
          closePopover={closePopover}
        >
          <EuiContextMenuPanel
            size="s"
            items={[
              <EuiContextMenuItem
                key="share"
                icon="dashboardApp"
                onClick={() => {
                  setDashboardAttachmentReady(true);
                  closePopover();
                }}
              >
                {i18n.translate(
                  'xpack.synthetics.embeddablePanelWrapper.shareContextMenuItemLabel',
                  {
                    defaultMessage: 'Add to dashboard',
                  }
                )}
              </EuiContextMenuItem>,
            ]}
          />
        </EuiPopover>
      )}
      {MaybeSavedObjectSaveModalDashboard}
    </>
  );
};
