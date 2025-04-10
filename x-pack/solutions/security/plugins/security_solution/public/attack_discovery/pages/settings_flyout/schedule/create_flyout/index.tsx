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

import * as i18n from './translations';

import { Footer } from '../../footer';
import { MIN_FLYOUT_WIDTH } from '../../constants';
import { useEditForm } from '../hooks/use_edit_form';
import type { AttackDiscoveryScheduleSchema } from '../hooks/types';

interface Props {
  onClose: () => void;
}

export const CreateFlyout: React.FC<Props> = React.memo(({ onClose }) => {
  const flyoutTitleId = useGeneratedHtmlId({
    prefix: 'attackDiscoveryScheduleCreateFlyoutTitle',
  });

  const onCreateSchedule = useCallback(
    (scheduleData: AttackDiscoveryScheduleSchema) => {
      // TODO: handle create schedule
      onClose();
    },
    [onClose]
  );

  const { editForm, actionButtons } = useEditForm({
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
