/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';

interface UsePillarProps {
  pillars: PillarProps;
}

export interface PillarProps {
  [key: string]: {
    value: string;
    displayName: string;
    color: string;
    description: string;
  };
}

export const usePillarProps = () => {
  const { euiTheme } = useEuiTheme();

  console.log(euiTheme);

  const pillars = {
    visibility: {
      value: 'visibility',
      displayName: 'Visibility',
      color: euiTheme.colors.vis.euiColorVisBehindText2,
      description:
        'Your visibility score is how well your systems are monitored through logs, agents, and cloud telemetry.',
    },
    detection: {
      value: 'detection',
      displayName: 'Detection',
      color: euiTheme.colors.vis.euiColorVisBehindText4,
      description:
        'Detections measure how well your system identifies threats through tuned, active detection rules.',
    },
    response: {
      value: 'response',
      displayName: 'Response',
      color: euiTheme.colors.vis.euiColorVisBehindText0,
      description:
        'Response shows how quickly and effectively your team investigates and acts on detected threats.',
    },
  };

  return {
    pillars,
  };
};
