/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiGlobalToastList, EuiText } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { FeatureFeedbackButton } from '@kbn/observability-shared-plugin/public';
import {
  useKibanaContextForPlugin,
  useKibanaEnvironmentContext,
} from '../../../../hooks/use_kibana';

const KUBERNETES_TOAST_STORAGE_KEY = 'kubernetesToastKey';
const KUBERNETES_FEEDBACK_LINK = 'https://ela.st/k8s-feedback';
const FEEDBACK_BUTTON_KUBERNETES_TEXT = i18n.translate(
  'xpack.infra.featureFeedbackButton.kubernetesText',
  {
    defaultMessage: 'Give feedback (K8s)',
  }
);
const START_SURVEY_BUTTON_TEXT = i18n.translate('xpack.infra.homePage.kubernetesToastButton', {
  defaultMessage: 'Start survey',
});

export const SurveyKubernetes = () => {
  const [isToastSeen, setIsToastSeen] = useLocalStorage(KUBERNETES_TOAST_STORAGE_KEY, false);
  const markToastAsSeen = () => setIsToastSeen(true);

  const { kibanaVersion, isCloudEnv, isServerlessEnv } = useKibanaEnvironmentContext();
  const { services } = useKibanaContextForPlugin();
  const isFeedbackEnabled = services.notifications.feedback.isEnabled();

  if (!isFeedbackEnabled) return null;

  return (
    <>
      <FeatureFeedbackButton
        formUrl={KUBERNETES_FEEDBACK_LINK}
        data-test-subj="infra-kubernetes-feedback-link"
        kibanaVersion={kibanaVersion}
        isCloudEnv={isCloudEnv}
        isServerlessEnv={isServerlessEnv}
        surveyButtonText={FEEDBACK_BUTTON_KUBERNETES_TEXT}
        sanitizedPath={document.location.pathname}
      />
      {!isToastSeen && (
        <EuiGlobalToastList
          toastLifeTimeMs={Infinity}
          dismissToast={markToastAsSeen}
          toasts={[
            {
              id: 'k8s-toast',
              title: (
                <FormattedMessage
                  id="xpack.infra.homePage.kubernetesToastTitle"
                  defaultMessage="We need your help!"
                />
              ),
              color: 'primary',
              iconType: 'help',
              text: (
                <>
                  <EuiText size="s" css={{ wordWrap: 'break-word', whiteSpace: 'normal' }}>
                    <FormattedMessage
                      id="xpack.infra.homePage.kubernetesToastText"
                      defaultMessage="Help us design your Kubernetes experience by completing a feedback survey."
                    />
                  </EuiText>
                  <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
                    <EuiFlexItem grow={false}>
                      <FeatureFeedbackButton
                        formUrl={KUBERNETES_FEEDBACK_LINK}
                        data-test-subj="infra-toast-kubernetes-survey-start"
                        onClickCapture={markToastAsSeen}
                        defaultButton
                        kibanaVersion={kibanaVersion}
                        isCloudEnv={isCloudEnv}
                        isServerlessEnv={isServerlessEnv}
                        surveyButtonText={START_SURVEY_BUTTON_TEXT}
                        sanitizedPath={document.location.pathname}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </>
              ),
            },
          ]}
        />
      )}
    </>
  );
};
