/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import useObservable from 'react-use/lib/useObservable';
import { EMPTY } from 'rxjs';
import type { InvestigationSeed } from '@kbn/investigation-seed';
import { useKibana } from '../utils/kibana_react';

export const findRelatedChangesLabel = (): string =>
  i18n.translate('xpack.observability.alerts.findRelatedChanges', {
    defaultMessage: 'Find related changes',
  });

/** True when the alert action can open Find related changes. */
export const canOpenSignalInvestigation = <T>(
  signalInvestigation: T | undefined,
  license: { hasAtLeast: (minimum: 'platinum') => boolean } | undefined
): signalInvestigation is T => Boolean(signalInvestigation && license?.hasAtLeast('platinum'));

export type SignalInvestigationAlertSurface = 'alertsTable' | 'alertDetails';

/** The alert action is absent below Platinum or when the plugin is disabled. */
export const useSignalInvestigation = (
  surface: SignalInvestigationAlertSurface,
  visible: boolean
): {
  open: ((seed: InvestigationSeed) => void) | undefined;
} => {
  const { licensing, signalInvestigation } = useKibana().services;
  const license = useObservable(licensing?.license$ ?? EMPTY);
  const canOpen = canOpenSignalInvestigation(signalInvestigation, license);

  useEffect(() => {
    if (canOpen && visible) {
      signalInvestigation.reportShown?.({ app: 'alerts', surface });
    }
  }, [canOpen, signalInvestigation, surface, visible]);

  if (!canOpen) {
    return { open: undefined };
  }

  return {
    open: (seed) => {
      void signalInvestigation.openInvestigation({ seed, session: 'start' });
    },
  };
};
