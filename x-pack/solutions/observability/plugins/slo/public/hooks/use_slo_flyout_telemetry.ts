/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { usePluginContext } from './use_plugin_context';

const noop = () => {};

export const useSloFlyoutTelemetry = () => {
  const { telemetry } = usePluginContext();

  return useMemo(() => {
    if (!telemetry) {
      return {
        reportDetailsFlyoutViewed: noop,
        reportDetailsFlyoutTabChanged: noop as (tabId: string) => void,
        reportDetailsFlyoutOpenInAppClicked: noop,
        reportCreateFlyoutViewed: noop,
      };
    }

    return {
      reportDetailsFlyoutViewed: () => telemetry.reportSloDetailsFlyoutViewed(),
      reportDetailsFlyoutTabChanged: (tabId: string) =>
        telemetry.reportSloDetailsFlyoutTabChanged({ tabId }),
      reportDetailsFlyoutOpenInAppClicked: () => telemetry.reportSloDetailsFlyoutOpenInAppClicked(),
      reportCreateFlyoutViewed: () => telemetry.reportSloCreateFlyoutViewed(),
    };
  }, [telemetry]);
};
