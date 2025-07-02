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

import { getEsQueryConfig } from '@kbn/data-plugin/common';
import { useAssistantContext, useLoadConnectors } from '@kbn/elastic-assistant';

import * as i18n from './translations';

import { useKibana } from '../../../../../common/lib/kibana';
import { convertToBuildEsQuery } from '../../../../../common/lib/kuery';
import { useSourcererDataView } from '../../../../../sourcerer/containers';
import { Footer } from '../../footer';
import { MIN_FLYOUT_WIDTH } from '../../constants';
import { useEditForm } from '../edit_form';
import type { AttackDiscoveryScheduleSchema } from '../edit_form/types';
import { useCreateAttackDiscoverySchedule } from '../logic/use_create_schedule';
import { parseFilterQuery } from '../../parse_filter_query';
import { getGenAiConfig } from '../../../use_attack_discovery/helpers';

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

  const { indexPattern } = useSourcererDataView();

  const { mutateAsync: createAttackDiscoverySchedule, isLoading: isLoadingQuery } =
    useCreateAttackDiscoverySchedule();

  const onCreateSchedule = useCallback(
    async (scheduleData: AttackDiscoveryScheduleSchema) => {
      const connector = aiConnectors?.find((item) => item.id === scheduleData.connectorId);
      if (!connector) {
        return;
      }

      try {
        const genAiConfig = getGenAiConfig(connector);

        const [filterQuery, kqlError] = convertToBuildEsQuery({
          config: getEsQueryConfig(uiSettings),
          indexPattern,
          queries: [scheduleData.alertsSelectionSettings.query],
          filters: scheduleData.alertsSelectionSettings.filters,
        });
        const filter = parseFilterQuery({ filterQuery, kqlError });

        const apiConfig = {
          connectorId: connector.id,
          name: connector.name,
          actionTypeId: connector.actionTypeId,
          provider: connector.apiProvider,
          model: genAiConfig?.defaultModel,
        };
        const scheduleToCreate = {
          name: scheduleData.name,
          enabled: true,
          params: {
            alertsIndexPattern: alertsIndexPattern ?? '',
            apiConfig,
            end: scheduleData.alertsSelectionSettings.end,
            filter,
            size: scheduleData.alertsSelectionSettings.size,
            start: scheduleData.alertsSelectionSettings.start,
          },
          schedule: { interval: scheduleData.interval },
          actions: scheduleData.actions,
        };
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
      indexPattern,
      uiSettings,
    ]
  );

  const { editForm, actionButtons } = useEditForm({
    onSave: onCreateSchedule,
    saveButtonDisabled: isLoadingConnectors || isLoadingQuery,
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
      size="s"
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
