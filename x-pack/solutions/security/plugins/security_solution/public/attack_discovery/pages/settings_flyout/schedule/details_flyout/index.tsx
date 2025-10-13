/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlyoutResizable,
  EuiSpacer,
  isDOMNode,
  keys,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { RuleAction } from '@kbn/alerting-types';
import { useAssistantContext, useLoadConnectors } from '@kbn/elastic-assistant';
import { DEFAULT_END, DEFAULT_START } from '@kbn/elastic-assistant-common';
import type { Filter } from '@kbn/es-query';

import { useDataView } from '../../../../../data_view_manager/hooks/use_data_view';
import * as i18n from './translations';

import { useKibana } from '../../../../../common/lib/kibana';
import { ConfirmationModal } from '../confirmation_modal';
import { Footer } from '../../footer';
import { MIN_FLYOUT_WIDTH } from '../../constants';
import type { AttackDiscoveryScheduleSchema } from '../edit_form/types';
import { useUpdateAttackDiscoverySchedule } from '../logic/use_update_schedule';
import { useGetAttackDiscoverySchedule } from '../logic/use_get_schedule';
import { getDefaultQuery } from '../../../helpers';
import { useEditForm } from '../edit_form/use_edit_form';
import { ScheduleDefinition } from './definition';
import { Header } from './header';
import { ScheduleExecutionLogs } from './execution_logs';
import { convertFormDataInBaseSchedule } from '../utils/convert_form_data';
import { PageScope } from '../../../../../data_view_manager/constants';
import { WithMissingPrivileges } from '../missing_privileges';

interface Props {
  scheduleId: string;
  onClose: () => void;
}

export const DetailsFlyout: React.FC<Props> = React.memo(({ scheduleId, onClose }) => {
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
    prefix: 'attackDiscoveryScheduleDetailsFlyoutTitle',
  });

  const {
    services: { uiSettings },
  } = useKibana();
  const { euiTheme } = useEuiTheme();

  const { alertsIndexPattern, http, settings } = useAssistantContext();
  const { data: aiConnectors, isLoading: isLoadingConnectors } = useLoadConnectors({
    http,
    settings,
  });
  const { data: { schedule } = { schedule: undefined }, isLoading: isLoadingSchedule } =
    useGetAttackDiscoverySchedule({
      id: scheduleId,
    });

  const { dataView } = useDataView(PageScope.alerts);

  const [isEditing, setIsEditing] = useState(false);

  const { mutateAsync: updateAttackDiscoverySchedule, isLoading: isLoadingQuery } =
    useUpdateAttackDiscoverySchedule();

  const onUpdateSchedule = useCallback(
    async (scheduleData: AttackDiscoveryScheduleSchema) => {
      const connector = aiConnectors?.find((item) => item.id === scheduleData.connectorId);
      if (!connector) {
        return;
      }

      try {
        const scheduleToUpdate = convertFormDataInBaseSchedule(
          scheduleData,
          alertsIndexPattern ?? '',
          connector,
          uiSettings,
          dataView
        );
        await updateAttackDiscoverySchedule({ id: scheduleId, scheduleToUpdate });
        setIsEditing(false);
      } catch (err) {
        // Error is handled by the mutation's onError callback, so no need to do anything here
      }
    },
    [
      aiConnectors,
      alertsIndexPattern,
      uiSettings,
      dataView,
      updateAttackDiscoverySchedule,
      scheduleId,
    ]
  );

  const isLoading = isLoadingSchedule || isLoadingConnectors || isLoadingQuery;

  const formInitialValue = useMemo(() => {
    if (schedule) {
      const params = schedule.params;
      return {
        name: schedule.name,
        connectorId: params.apiConfig.connectorId,
        alertsSelectionSettings: {
          query: params.query ?? getDefaultQuery(),
          filters: (params.filters as Filter[]) ?? [],
          size: params.size,
          start: params.start ?? DEFAULT_START,
          end: params.end ?? DEFAULT_END,
        },
        interval: schedule.schedule.interval,
        actions: schedule.actions as RuleAction[],
      };
    }
  }, [schedule]);
  const { editForm, actionButtons: editingActionButtons } = useEditForm({
    initialValue: formInitialValue,
    isLoading,
    onFormMutated,
    onSave: onUpdateSchedule,
    saveButtonTitle: i18n.SCHEDULE_SAVE_BUTTON_TITLE,
  });

  const scheduleDetails = useMemo(() => {
    if (schedule) {
      return (
        <div data-test-subj="scheduleDetails">
          <ScheduleDefinition schedule={schedule} />
          <EuiSpacer size="xl" />
          <ScheduleExecutionLogs schedule={schedule} />
        </div>
      );
    }
  }, [schedule]);

  const content = useMemo(() => {
    if (isEditing) {
      return editForm;
    }
    return scheduleDetails;
  }, [editForm, isEditing, scheduleDetails]);

  const editButton = useMemo(() => {
    return (
      <EuiFlexGroup alignItems="center" gutterSize="none">
        <EuiFlexItem
          css={css`
            margin-right: ${euiTheme.size.s};
          `}
          grow={false}
        >
          <EuiFlexItem grow={false}>
            <WithMissingPrivileges>
              {(enabled) => (
                <EuiButton
                  data-test-subj="edit"
                  size="m"
                  onClick={() => setIsEditing(true)}
                  disabled={isLoading || !enabled}
                >
                  {i18n.SCHEDULE_EDIT_BUTTON_TITLE}
                </EuiButton>
              )}
            </WithMissingPrivileges>
          </EuiFlexItem>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }, [euiTheme.size.s, isLoading]);

  const actionButtons = useMemo(() => {
    return isEditing ? editingActionButtons : [editButton];
  }, [editButton, editingActionButtons, isEditing]);

  const handleCloseButtonClick = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowConfirmModal(true);
    } else {
      onClose();

      setIsEditing(false);
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
        data-test-subj="scheduleDetailsFlyout"
        minWidth={MIN_FLYOUT_WIDTH}
        onClose={handleCloseButtonClick}
        onKeyDown={onKeyDown}
        outsideClickCloses={!isEditing}
        paddingSize="m"
        side="right"
        size="m"
        type="overlay"
      >
        <EuiFlyoutHeader hasBorder>
          <Header
            isEditing={isEditing}
            isLoading={isLoading}
            schedule={schedule}
            titleId={flyoutTitleId}
          />
        </EuiFlyoutHeader>

        <EuiFlyoutBody>
          <EuiSpacer size="s" />
          {content}
        </EuiFlyoutBody>

        <EuiFlyoutFooter>
          <Footer closeModal={handleCloseButtonClick} actionButtons={actionButtons} />
        </EuiFlyoutFooter>
      </EuiFlyoutResizable>

      {showConfirmModal && <ConfirmationModal onCancel={onCancel} onDiscard={onDiscard} />}
    </>
  );
});
DetailsFlyout.displayName = 'DetailsFlyout';
