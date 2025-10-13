/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlyoutResizable,
  EuiSpacer,
  EuiTitle,
  isDOMNode,
  keys,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { useAssistantContext, useLoadConnectors } from '@kbn/elastic-assistant';
import React, { useCallback, useState } from 'react';
import { PageScope } from '../../../../../data_view_manager/constants';
import { useDataView } from '../../../../../data_view_manager/hooks/use_data_view';
import { useKibana } from '../../../../../common/lib/kibana';
import { ConfirmationModal } from '../confirmation_modal';
import { Footer } from '../../footer';
import { MIN_FLYOUT_WIDTH } from '../../constants';
import { useEditForm } from '../edit_form';
import type { AttackDiscoveryScheduleSchema } from '../edit_form/types';
import { useCreateAttackDiscoverySchedule } from '../logic/use_create_schedule';
import * as i18n from './translations';
import { convertFormDataInBaseSchedule } from '../utils/convert_form_data';

interface Props {
  onClose: () => void;
}

export const CreateFlyout: React.FC<Props> = React.memo(({ onClose }) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const onFormMutated = useCallback(() => setHasUnsavedChanges(true), []);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const onCancel = useCallback(() => {
    setShowConfirmModal(false); // just close the modal
  }, []);

  const onDiscard = useCallback(() => {
    setShowConfirmModal(false);
    onClose();
  }, [onClose]);

  const flyoutTitleId = useGeneratedHtmlId({
    prefix: 'attackDiscoveryScheduleCreateFlyoutTitle',
  });

  const {
    services: { uiSettings },
  } = useKibana();

  const { alertsIndexPattern, http, settings } = useAssistantContext();
  const { data: aiConnectors, isLoading: isLoadingConnectors } = useLoadConnectors({
    http,
    settings,
  });

  const { dataView } = useDataView(PageScope.alerts);

  const { mutateAsync: createAttackDiscoverySchedule, isLoading: isLoadingQuery } =
    useCreateAttackDiscoverySchedule();

  const onCreateSchedule = useCallback(
    async (scheduleData: AttackDiscoveryScheduleSchema) => {
      const connector = aiConnectors?.find((item) => item.id === scheduleData.connectorId);
      if (!connector) {
        return;
      }

      try {
        const scheduleToCreate = convertFormDataInBaseSchedule(
          scheduleData,
          alertsIndexPattern ?? '',
          connector,
          uiSettings,
          dataView
        );
        await createAttackDiscoverySchedule({ scheduleToCreate });
        onClose();
      } catch (err) {
        // Error is handled by the mutation's onError callback, so no need to do anything here
      }
    },
    [aiConnectors, alertsIndexPattern, createAttackDiscoverySchedule, dataView, onClose, uiSettings]
  );

  const { editForm, actionButtons } = useEditForm({
    isLoading: isLoadingConnectors || isLoadingQuery,
    onFormMutated,
    onSave: onCreateSchedule,
    saveButtonTitle: i18n.SCHEDULE_CREATE_BUTTON_TITLE,
  });

  const handleCloseButtonClick = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowConfirmModal(true);
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

  const onKeyDown = useCallback(
    (ev: React.KeyboardEvent) => {
      if (isDOMNode(ev.target) && ev.currentTarget.contains(ev.target) && ev.key === keys.ESCAPE) {
        ev.preventDefault();
        ev.stopPropagation();

        handleCloseButtonClick();
      }
    },
    [handleCloseButtonClick]
  );

  return (
    <>
      <EuiFlyoutResizable
        aria-labelledby={flyoutTitleId}
        data-test-subj="scheduleCreateFlyout"
        minWidth={MIN_FLYOUT_WIDTH}
        onClose={handleCloseButtonClick}
        onKeyDown={onKeyDown}
        paddingSize="m"
        side="right"
        size="m"
        type="overlay"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle data-test-subj="title" size="m">
            <h2 id={flyoutTitleId}>{i18n.SCHEDULE_CREATE_TITLE}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>

        <EuiFlyoutBody>
          <EuiSpacer size="s" />
          {editForm}
        </EuiFlyoutBody>

        <EuiFlyoutFooter>
          <Footer closeModal={handleCloseButtonClick} actionButtons={actionButtons} />
        </EuiFlyoutFooter>
      </EuiFlyoutResizable>

      {showConfirmModal && <ConfirmationModal onCancel={onCancel} onDiscard={onDiscard} />}
    </>
  );
});
CreateFlyout.displayName = 'CreateFlyout';
