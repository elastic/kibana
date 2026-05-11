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

export const GROUP_BY_TOUR_STORAGE_KEY = 'synthetics.groupByTourSeen';

const DISMISS_LABEL = i18n.translate('xpack.synthetics.overview.groupByTour.dismiss', {
  defaultMessage: 'Dismiss',
});

export const GroupByTour = ({ children }: Props) => {
  const { services } = useKibana();
  const [isTourSeen, setIsTourSeen] = useLocalStorage(GROUP_BY_TOUR_STORAGE_KEY, false);
  const markTourAsSeen = () => setIsTourSeen(true);
  const isTourEnabled = services.notifications?.tours?.isEnabled() ?? false;

  if (!isTourEnabled) return <>{children}</>;

  return (
    <EuiTourStep
      content={
        <EuiText size="s" color="subdued" data-test-subj="syntheticsGroupByTour-text">
          {i18n.translate('xpack.synthetics.overview.groupByTour.text', {
            defaultMessage:
              'You can now group by monitor to see all locations for each monitor together in one view.',
          })}
        </EuiText>
      }
      isStepOpen={!isTourSeen}
      maxWidth={350}
      onFinish={markTourAsSeen}
      step={1}
      stepsTotal={1}
      title={i18n.translate('xpack.synthetics.overview.groupByTour.title', {
        defaultMessage: 'New: Group by monitor',
      })}
      anchorPosition="downCenter"
      footerAction={
        <EuiButtonEmpty
          aria-label={DISMISS_LABEL}
          data-test-subj="syntheticsGroupByTour-dismiss"
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
