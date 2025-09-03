/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect } from 'react';
import dedent from 'dedent';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useSelectedMonitor } from './use_selected_monitor';
import { useSelectedLocation } from './use_selected_location';
import type { ClientPluginsStart } from '../../../../../plugin';

export const useMonitorScreenContext = () => {
  const { monitor } = useSelectedMonitor();
  const selectedLocation = useSelectedLocation();
  const services = useKibana<ClientPluginsStart>().services;
  const setScreenContext = services.observabilityAIAssistant?.service.setScreenContext;

  useEffect(() => {
    if (!monitor || !setScreenContext) {
      return;
    }

    if (setScreenContext) {
      const screenContext = dedent`The user is looking at the details of a monitor.
            
          Monitor ID: ${monitor.id}
          Monitor Saved Object ID: ${monitor.config_id}
          Monitor Type: ${monitor.type}
          Monitor Name: ${monitor.name}
          Location: ${selectedLocation.label}
          
          When referencing the monitor, use the monitor name. 
          Only utilize monitor ID when needed for a specific Elasticsearch query`;

      return setScreenContext({
        screenDescription: screenContext,
      });
    }
  }, [setScreenContext, monitor, selectedLocation?.label]);
  return {
    monitor,
    selectedLocation,
  };
};
