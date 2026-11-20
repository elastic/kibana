/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import type { AnalyticsEventSource } from '../../types';
import { getDefaultEventSource } from './event_source_utils';

/** The event source the user is working with: their pick, or the default one. */
export const useSelectedEventSource = (
  sources: readonly AnalyticsEventSource[]
): readonly [AnalyticsEventSource | undefined, (name: string) => void] => {
  const [selectedName, setSelectedName] = useState<string>();
  const selectedSource =
    sources.find(({ name }) => name === selectedName) ?? getDefaultEventSource(sources);
  return [selectedSource, setSelectedName];
};
