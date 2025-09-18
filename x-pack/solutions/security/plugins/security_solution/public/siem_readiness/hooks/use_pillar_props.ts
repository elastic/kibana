/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';

interface UsePillarsProps {
  pillars: PillarsProps;
}

export type PillarKey = 'visibility' | 'detection' | 'response';

export interface PillarsProps {
  [key: PillarKey]: PillarProps;
}

export interface PillarProps {
  pillarKey: PillarKey;
  displayName: 'Visibility' | 'Detection' | 'Response';
  color: string;
  description: string;
  icon: string;
}

export const usePillarsProps = (): UsePillarsProps => {
  const { euiTheme } = useEuiTheme();

  const pillarsProps = {
    visibility: {
      pillarKey: 'visibility',
      displayName: 'Visibility',
      color: euiTheme.colors.vis.euiColorVisBehindText2,
      description:
        'Your visibility score is how well your systems are monitored through logs, agents, and cloud telemetry.',
      icon: 'eye',
    },
    detection: {
      pillarKey: 'detection',
      displayName: 'Detection',
      color: euiTheme.colors.vis.euiColorVisBehindText4,
      description:
        'Detections measure how well your system identifies threats through tuned, active detection rules.',
      icon: 'securitySignal',
    },
    response: {
      pillarKey: 'response',
      displayName: 'Response',
      color: euiTheme.colors.vis.euiColorVisBehindText0,
      description:
        'Response shows how quickly and effectively your team investigates and acts on detected threats.',
      icon: 'magnifyWithExclamation',
    },
  };

  return {
    pillarsProps,
  };
};
