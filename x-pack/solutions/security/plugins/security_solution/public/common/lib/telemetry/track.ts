/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UiCounterMetricType } from '@kbn/analytics';
import type { SetupPlugins } from '../../../types';

type TrackFn = (type: UiCounterMetricType, event: string | string[], count?: number) => void;

const noop = () => {};

let _track: TrackFn;

export const track: TrackFn = (type, event, count) => {
  try {
    _track(type, event, count);
  } catch (error) {
    // ignore failed tracking call
  }
};

export const initTelemetry = (
  { usageCollection }: Pick<SetupPlugins, 'usageCollection'>,
  appId: string
) => {
  _track = usageCollection?.reportUiCounter?.bind(null, appId) ?? noop;
};
