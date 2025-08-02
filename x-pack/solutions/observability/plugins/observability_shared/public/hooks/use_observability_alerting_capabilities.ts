/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useMemo } from 'react';
import {
  apmFeatureId,
  infraFeatureId,
  logsFeatureId,
  sloFeatureId,
  uptimeFeatureId,
} from '../../common';

const ALERTING_SHOW = 'alerting:show';
const ALERTING_SAVE = 'alerting:save';

type AlertingFeatureId =
  | typeof apmFeatureId
  | typeof infraFeatureId
  | typeof logsFeatureId
  | typeof sloFeatureId
  | typeof uptimeFeatureId;

/**
 * Hook that returns the alerting capabilities for the given featureId.
 *
 * The hook returns an object with two properties:
 * - `save`: boolean indicating whether the user has the capability to save
 *   alerts for the given featureId.
 * - `show`: boolean indicating whether the user has the capability to show
 *   alerts for the given featureId.
 *
 * @param featureId - The ID of the feature for which to return the alerting
 *   capabilities. Can be one of the following:
 *   - 'apm'
 *   - 'infra'
 *   - 'logs'
 *   - 'slo'
 *   - 'uptime'
 * @returns An object with `save` and `show` properties, or `undefined` if the
 *   user does not have the capability to interact with alerts for the given
 *   featureId.
 */
export const useObservabilityAlertingCapabilities = (featureId: AlertingFeatureId) => {
  const { application } = useKibana().services;

  const featureCapabilities = useMemo(() => {
    if (!application?.capabilities) {
      return;
    }

    const capabilities = application.capabilities;
    return {
      [apmFeatureId]: {
        save: !!capabilities[apmFeatureId]?.save && !!capabilities[apmFeatureId]?.[ALERTING_SAVE],
        show: !!capabilities[apmFeatureId]?.show && !!capabilities[apmFeatureId]?.[ALERTING_SHOW],
      },
      [infraFeatureId]: {
        save: !!capabilities[infraFeatureId]?.save,
        show: !!capabilities[infraFeatureId]?.show,
      },
      [logsFeatureId]: {
        save: !!capabilities[logsFeatureId]?.save,
        show: !!capabilities[logsFeatureId]?.show,
      },
      [sloFeatureId]: {
        save: !!capabilities[sloFeatureId]?.write,
        show: !!capabilities[sloFeatureId]?.read,
      },
      [uptimeFeatureId]: {
        save:
          !!capabilities[uptimeFeatureId]?.save && !!capabilities[uptimeFeatureId]?.[ALERTING_SAVE],
        show: !!capabilities[uptimeFeatureId]?.show,
      },
    };
  }, [application]);

  return featureCapabilities?.[featureId];
};
