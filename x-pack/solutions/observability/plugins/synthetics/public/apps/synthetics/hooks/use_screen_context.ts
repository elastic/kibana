/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ClientPluginsStart } from '../../../plugin';

export const useScreenContext = ({ screenDescription }: { screenDescription: string }) => {
  const services = useKibana<ClientPluginsStart>().services;
  const setScreenContext = services.observabilityAIAssistant?.service.setScreenContext;

  useEffect(() => {
    if (setScreenContext) {
      return setScreenContext({
        screenDescription,
      });
    }
  }, [setScreenContext, screenDescription]);
};
