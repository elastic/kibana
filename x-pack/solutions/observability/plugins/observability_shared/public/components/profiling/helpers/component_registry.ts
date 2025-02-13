/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const registry: { [key: string]: React.FC<any> } = {};

export const registerProfilingComponent = <T>(key: string, component: React.FC<T>) => {
  if (registry[key] !== undefined) {
    throw new Error(
      i18n.translate('xpack.observabilityShared.profilingComponentAlreadyExists.error', {
        defaultMessage: `Component with key {key} already exists`,
        values: { key },
      })
    );
  }
  registry[key] = component;
};

export const getProfilingComponent = <T>(key: string): React.FC<T> => {
  if (registry[key] === undefined) {
    throw new Error(
      i18n.translate('xpack.observabilityShared.profilingComponentNotFound.error', {
        defaultMessage: `Component with key {key} not found`,
        values: { key },
      })
    );
  }
  return registry[key];
};
