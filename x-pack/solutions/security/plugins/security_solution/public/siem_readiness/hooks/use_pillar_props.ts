/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface UsePillarsProps {
  pillarPropsMap: PillarsProps;
}

export type PillarKey = 'visibility' | 'detection' | 'response';

export interface PillarsProps {
  visibility: PillarProps;
  detection: PillarProps;
  response: PillarProps;
}

export interface PillarProps {
  pillarKey: PillarKey;
  displayName: string;
  color: string;
  description: string;
  icon: string;
}

export const usePillarsProps = (): UsePillarsProps => {
  const { euiTheme } = useEuiTheme();

  const pillarPropsMap: PillarsProps = {
    visibility: {
      pillarKey: 'visibility',
      displayName: i18n.translate('xpack.securitySolution.siemReadiness.visibility.displayName', {
        defaultMessage: 'Visibility',
      }),
      color: euiTheme.colors.vis.euiColorVisBehindText2,
      description: i18n.translate('xpack.securitySolution.siemReadiness.visibility.description', {
        defaultMessage:
          'Your visibility score is how well your systems are monitored through logs, agents, and cloud telemetry.',
      }),
      icon: 'eye',
    },
    detection: {
      pillarKey: 'detection',
      displayName: i18n.translate('xpack.securitySolution.siemReadiness.detection.displayName', {
        defaultMessage: 'Detection',
      }),
      color: euiTheme.colors.vis.euiColorVisBehindText4,
      description: i18n.translate('xpack.securitySolution.siemReadiness.detection.description', {
        defaultMessage:
          'Detections measure how well your system identifies threats through tuned, active detection rules.',
      }),
      icon: 'securitySignal',
    },
    response: {
      pillarKey: 'response',
      displayName: i18n.translate('xpack.securitySolution.siemReadiness.response.displayName', {
        defaultMessage: 'Response',
      }),
      color: euiTheme.colors.vis.euiColorVisBehindText0,
      description: i18n.translate('xpack.securitySolution.siemReadiness.response.description', {
        defaultMessage:
          'Response shows how quickly and effectively your team investigates and acts on detected threats.',
      }),
      icon: 'magnifyWithExclamation',
    },
  };

  return {
    pillarPropsMap,
  };
};
