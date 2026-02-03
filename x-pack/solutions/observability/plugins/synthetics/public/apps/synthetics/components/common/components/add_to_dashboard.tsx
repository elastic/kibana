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
import type { SaveModalDashboardProps } from '@kbn/presentation-util-plugin/public';
import {
  LazySavedObjectSaveModalDashboard,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useSelector } from 'react-redux';
import type { ClientPluginsStart } from '../../../../../plugin';
import type { SYNTHETICS_MONITORS_EMBEDDABLE } from '../../../../embeddables/constants';
import { selectOverviewState } from '../../../state';
import type { OverviewMonitorsEmbeddableCustomState } from '../../../../embeddables/monitors_overview/monitors_embeddable_factory';
import { SYNTHETICS_STATS_OVERVIEW_EMBEDDABLE } from '../../../../../../common/embeddables/stats_overview/constants';
import type { OverviewStatsEmbeddableCustomState } from '../../../../../../common/embeddables/stats_overview/types';

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
    async ({ dashboardId }) => {
      const stateTransfer = embeddable.getStateTransfer();

      const state = {
        serializedState: embeddableInput,
        type,
      };

      const path = dashboardId === 'new' ? '#/create' : `#/view/${dashboardId}`;

      stateTransfer.navigateToWithEmbeddablePackages('dashboards', {
        state: [state],
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
  isLoading,
  asButton = false,
}: {
  type: typeof SYNTHETICS_STATS_OVERVIEW_EMBEDDABLE | typeof SYNTHETICS_MONITORS_EMBEDDABLE;
  asButton?: boolean;
  isLoading?: boolean;
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
          isLoading={isLoading}
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
              isLoading={isLoading}
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
