/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiConfirmModal, EuiIllustration, useGeneratedHtmlId } from '@elastic/eui';
import { aerospace } from '@elastic/eui-illustrations';
import { AnnouncementBanner } from '@kbn/announcement-banner';
import {
  ALERTING_V1_ENABLED_SETTING_ID,
  ALERTING_V2_EPISODES_APP_ID,
  ALERTING_V2_SECTION_ID,
} from '@kbn/alerting-v2-constants';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../../utils/kibana_react';

const TITLE = i18n.translate('xpack.observability.alerts.newAlertsExperienceBanner.title', {
  defaultMessage: 'Try the new Alerts experience',
});
const DESCRIPTION = i18n.translate(
  'xpack.observability.alerts.newAlertsExperienceBanner.description',
  {
    defaultMessage:
      'The new Alerts page brings alerts from Kibana ES|QL alerting, Kibana standard alerting, and external sources into one inbox so you can triage everything in a single place.',
  }
);
const GO_TO_NEW_ALERTS_LABEL = i18n.translate(
  'xpack.observability.alerts.newAlertsExperienceBanner.goToNewAlertsButton',
  { defaultMessage: 'Go to new experience' }
);
const DISABLE_STANDARD_LABEL = i18n.translate(
  'xpack.observability.alerts.newAlertsExperienceBanner.disableStandardButton',
  { defaultMessage: 'Disable this alerts view' }
);
const ILLUSTRATION_ALT = i18n.translate(
  'xpack.observability.alerts.newAlertsExperienceBanner.illustrationAlt',
  { defaultMessage: 'New alerts experience illustration' }
);

export const NewAlertsExperienceBanner = () => {
  const {
    services: {
      application,
      settings,
      notifications: { toasts },
    },
  } = useKibana();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const modalTitleId = useGeneratedHtmlId();

  const newAlertsHref = useMemo(
    () =>
      application.getUrlForApp('management', {
        path: `/${ALERTING_V2_SECTION_ID}/${ALERTING_V2_EPISODES_APP_ID}`,
      }),
    [application]
  );

  const openConfirmModal = () => setIsConfirmOpen(true);
  const closeConfirmModal = () => {
    if (isDisabling) {
      return;
    }
    setIsConfirmOpen(false);
  };

  const disableStandardAlerts = async () => {
    setIsDisabling(true);
    try {
      await settings.globalClient.set(ALERTING_V1_ENABLED_SETTING_ID, false);
      window.location.assign(newAlertsHref);
    } catch (error) {
      setIsDisabling(false);
      setIsConfirmOpen(false);
      toasts.addError(error instanceof Error ? error : new Error(String(error)), {
        title: i18n.translate(
          'xpack.observability.alerts.newAlertsExperienceBanner.disableStandardErrorTitle',
          { defaultMessage: 'Unable to disable the Standard Alerts view' }
        ),
      });
    }
  };

  return (
    <>
      <AnnouncementBanner
        data-test-subj="newAlertsExperienceBanner"
        size="m"
        headingElement="h3"
        title={TITLE}
        text={DESCRIPTION}
        media={
          <EuiIllustration
            type={aerospace}
            alt={ILLUSTRATION_ALT}
            style={{ maxInlineSize: 80, marginInline: 'auto' }}
            data-test-subj="newAlertsExperienceBannerIllustration"
          />
        }
        actionProps={{
          primary: {
            children: GO_TO_NEW_ALERTS_LABEL,
            href: newAlertsHref,
            'data-test-subj': 'newAlertsExperienceBannerGoToNewButton',
          },
          secondary: {
            children: DISABLE_STANDARD_LABEL,
            onClick: openConfirmModal,
            'data-test-subj': 'newAlertsExperienceBannerDisableStandardButton',
          },
        }}
      />
      {isConfirmOpen && (
        <EuiConfirmModal
          aria-labelledby={modalTitleId}
          titleProps={{ id: modalTitleId }}
          title={i18n.translate(
            'xpack.observability.alerts.newAlertsExperienceBanner.confirmTitle',
            { defaultMessage: 'Disable the Standard alerts view?' }
          )}
          onCancel={closeConfirmModal}
          onConfirm={disableStandardAlerts}
          cancelButtonText={i18n.translate(
            'xpack.observability.alerts.newAlertsExperienceBanner.confirmCancel',
            { defaultMessage: 'Cancel' }
          )}
          confirmButtonText={i18n.translate(
            'xpack.observability.alerts.newAlertsExperienceBanner.confirmButton',
            { defaultMessage: 'Disable standard experience' }
          )}
          buttonColor="primary"
          isLoading={isDisabling}
          data-test-subj="newAlertsExperienceBannerConfirmModal"
        >
          <FormattedMessage
            id="xpack.observability.alerts.newAlertsExperienceBanner.confirmBody"
            defaultMessage="Turn off the Standard alerts experience, removes it from the navigation menu, and takes you to the new alerts experience. You can change this later in Advanced Settings."
          />
        </EuiConfirmModal>
      )}
    </>
  );
};
