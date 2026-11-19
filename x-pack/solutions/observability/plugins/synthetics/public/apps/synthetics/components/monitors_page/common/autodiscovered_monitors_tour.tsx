/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiTourStep, EuiText, EuiButtonEmpty } from '@elastic/eui';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useKibana } from '@kbn/kibana-react-plugin/public';

interface Props {
  children: ReactElement;
}

export const AUTODISCOVERED_MONITORS_TOUR_STORAGE_KEY = 'synthetics.autodiscoveredMonitorsTourSeen';

const DISMISS_LABEL = i18n.translate(
  'xpack.synthetics.overview.autodiscoveredMonitorsTour.dismiss',
  {
    defaultMessage: 'Dismiss',
  }
);

/**
 * One-step tour anchored to the Display options button, pointing users at the
 * new "Show autodiscovered monitors" preference. Mirrors `GroupByTour`: shown
 * once per browser (localStorage) and gated on the global tours-enabled flag.
 */
export const AutodiscoveredMonitorsTour = ({ children }: Props) => {
  const { services } = useKibana();
  const [isTourSeen, setIsTourSeen] = useLocalStorage(
    AUTODISCOVERED_MONITORS_TOUR_STORAGE_KEY,
    false
  );
  const markTourAsSeen = () => setIsTourSeen(true);
  const isTourEnabled = services.notifications?.tours?.isEnabled() ?? false;

  if (!isTourEnabled) return <>{children}</>;

  return (
    <EuiTourStep
      content={
        <EuiText
          size="s"
          color="subdued"
          data-test-subj="syntheticsAutodiscoveredMonitorsTour-text"
        >
          {i18n.translate('xpack.synthetics.overview.autodiscoveredMonitorsTour.text', {
            defaultMessage:
              'Read-only Heartbeat and Elastic Agent monitors (e.g. Kubernetes/Docker autodiscovery) now appear in the overview. Use Display options to show or hide them.',
          })}
        </EuiText>
      }
      isStepOpen={!isTourSeen}
      maxWidth={350}
      onFinish={markTourAsSeen}
      step={1}
      stepsTotal={1}
      title={i18n.translate('xpack.synthetics.overview.autodiscoveredMonitorsTour.title', {
        defaultMessage: 'New: Autodiscovered monitors',
      })}
      anchorPosition="downRight"
      footerAction={
        <EuiButtonEmpty
          aria-label={DISMISS_LABEL}
          data-test-subj="syntheticsAutodiscoveredMonitorsTour-dismiss"
          size="s"
          color="text"
          onClick={markTourAsSeen}
        >
          {DISMISS_LABEL}
        </EuiButtonEmpty>
      }
    >
      {children}
    </EuiTourStep>
  );
};
