/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getEbtProps } from '@kbn/ebt-click';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { DIGITAL_EXPERIENCE_EBT_ACTIONS, SESSIONS_EBT_ELEMENTS } from '../../../ebt_constants';
import { httpErrorMessage } from '../../../utils/http_error_message';

const TURN_OFF_LABEL = i18n.translate('xpack.digitalExperience.sessions.turnOff.buttonLabel', {
  defaultMessage: 'Turn sessions off',
});

/**
 * Turns sessions off for every space after a confirmation, for users who manage them. The app
 * then no longer sets them up by itself.
 */
export function TurnOffSessionsButton({
  onDisable,
  disabling,
  disableError,
}: {
  onDisable: () => Promise<void>;
  disabling: boolean;
  disableError: Error | undefined;
}) {
  const [confirming, setConfirming] = useState(false);
  const titleId = useGeneratedHtmlId({ prefix: 'turnOffSessions' });

  return (
    <>
      <EuiButtonEmpty
        data-test-subj="digitalExperienceSessionsTurnOff"
        size="xs"
        color="danger"
        iconType="pause"
        onClick={() => setConfirming(true)}
        {...getEbtProps({
          action: DIGITAL_EXPERIENCE_EBT_ACTIONS.DISABLE_SESSIONS,
          element: SESSIONS_EBT_ELEMENTS.TURN_OFF,
        })}
      >
        {TURN_OFF_LABEL}
      </EuiButtonEmpty>
      {confirming && (
        <EuiModal
          data-test-subj="digitalExperienceSessionsTurnOffModal"
          aria-labelledby={titleId}
          onClose={() => setConfirming(false)}
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle id={titleId}>
              {i18n.translate('xpack.digitalExperience.sessions.turnOff.title', {
                defaultMessage: 'Turn sessions off?',
              })}
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiText size="s">
              <p>
                {i18n.translate('xpack.digitalExperience.sessions.turnOff.description', {
                  defaultMessage:
                    'No new sessions are built for any application, in any space, and EDOT Browser applications are no longer listed from new data. The sessions built so far are kept. Sessions stay off until a user who manages them turns them back on.',
                })}
              </p>
            </EuiText>
            {disableError && (
              <KbnDangerCallout
                data-test-subj="digitalExperienceSessionsTurnOffError"
                announceOnMount
                size="s"
                title={i18n.translate('xpack.digitalExperience.sessions.turnOff.errorTitle', {
                  defaultMessage: 'Could not turn sessions off',
                })}
                text={httpErrorMessage(disableError)}
              />
            )}
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButtonEmpty
              data-test-subj="digitalExperienceSessionsTurnOffCancel"
              onClick={() => setConfirming(false)}
              {...getEbtProps({
                action: DIGITAL_EXPERIENCE_EBT_ACTIONS.CANCEL_DISABLE_SESSIONS,
                element: SESSIONS_EBT_ELEMENTS.TURN_OFF_CANCEL,
              })}
            >
              {i18n.translate('xpack.digitalExperience.sessions.turnOff.cancel', {
                defaultMessage: 'Keep them on',
              })}
            </EuiButtonEmpty>
            <EuiButton
              data-test-subj="digitalExperienceSessionsTurnOffConfirm"
              color="danger"
              fill
              isLoading={disabling}
              // Once off, the parent no longer shows this, which closes the modal.
              onClick={() => onDisable()}
              {...getEbtProps({
                action: DIGITAL_EXPERIENCE_EBT_ACTIONS.DISABLE_SESSIONS,
                element: SESSIONS_EBT_ELEMENTS.TURN_OFF_CONFIRM,
              })}
            >
              {TURN_OFF_LABEL}
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      )}
    </>
  );
}
