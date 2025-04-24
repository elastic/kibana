/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlyoutResizable,
  EuiSpacer,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { useAssistantContext, useLoadConnectors } from '@kbn/elastic-assistant';

import { useKibana } from '../../../../../common/lib/kibana';
import { useSourcererDataView } from '../../../../../sourcerer/containers';
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
  const flyoutTitleId = useGeneratedHtmlId({
    prefix: 'attackDiscoveryScheduleCreateFlyoutTitle',
  });

  const {
    services: { uiSettings },
  } = useKibana();

  const { alertsIndexPattern, http } = useAssistantContext();
  const { data: aiConnectors, isLoading: isLoadingConnectors } = useLoadConnectors({
    http,
  });

  const { sourcererDataView } = useSourcererDataView();

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
          sourcererDataView,
          uiSettings
        );
        await createAttackDiscoverySchedule({ scheduleToCreate });
        onClose();
      } catch (err) {
        // Error is handled by the mutation's onError callback, so no need to do anything here
      }
    },
    [
      aiConnectors,
      alertsIndexPattern,
      createAttackDiscoverySchedule,
      onClose,
      sourcererDataView,
      uiSettings,
    ]
  );

  const { editForm, actionButtons } = useEditForm({
    isLoading: isLoadingConnectors || isLoadingQuery,
    onSave: onCreateSchedule,
    saveButtonTitle: i18n.SCHEDULE_CREATE_BUTTON_TITLE,
  });

  return (
    <EuiFlyoutResizable
      aria-labelledby={flyoutTitleId}
      data-test-subj="scheduleCreateFlyout"
      minWidth={MIN_FLYOUT_WIDTH}
      onClose={onClose}
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
        <Footer closeModal={onClose} actionButtons={actionButtons} />
      </EuiFlyoutFooter>
    </EuiFlyoutResizable>
  );
});
CreateFlyout.displayName = 'CreateFlyout';
