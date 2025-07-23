/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
export const UP = i18n.translate('xpack.securitySolution.aiValue.up', {
  defaultMessage: 'up',
});

export const DOWN = i18n.translate('xpack.securitySolution.aiValue.down', {
  defaultMessage: 'down',
});

export const COST_SAVINGS = i18n.translate('xpack.securitySolution.aiValue.costSavings', {
  defaultMessage: 'cost savings',
});

export const COST_SAVINGS_TITLE = i18n.translate(
  'xpack.securitySolution.aiValue.costSavingsTitle',
  {
    defaultMessage: 'Cost savings',
  }
);

export const COST_SAVINGS_TREND = i18n.translate(
  'xpack.securitySolution.aiValue.costSavingsTrend',
  {
    defaultMessage: 'Cost savings trend',
  }
);
export const COST_SAVINGS_SOC = i18n.translate('xpack.securitySolution.aiValue.costSavingsSoc', {
  defaultMessage: 'Cumulative savings from AI-driven SOC operations',
});

export const COST_SAVINGS_DESC = i18n.translate('xpack.securitySolution.aiValue.costSavingsDesc', {
  defaultMessage: 'Estimated cost reduction based on analyst time saved',
});

export const COST_SAVINGS_BASIS = i18n.translate(
  'xpack.securitySolution.aiValue.costSavingsBasis',
  {
    defaultMessage: 'Based on analyst time saved',
  }
);

export const NO_CHANGE = (dataType: string) =>
  i18n.translate('xpack.securitySolution.aiValue.noChange', {
    defaultMessage: 'Your {dataType} is unchanged',
    values: { dataType },
  });

export const STAT_DIFFERENCE = ({
  upOrDown,
  percentageChange,
  stat,
  statType,
}: {
  upOrDown: string;
  percentageChange: string;
  stat: string;
  statType: string;
}) =>
  i18n.translate('xpack.securitySolution.aiValue.timeDifference', {
    defaultMessage: `Your {statType} is {upOrDown} by {percentageChange} from {stat}`,
    values: { upOrDown, percentageChange, stat, statType },
  });

export const TIME_RANGE = (timeRange: string) =>
  i18n.translate('xpack.securitySolution.aiValue.timeRange', {
    defaultMessage: 'over the last {timeRange} days',
    values: { timeRange },
  });

export const THREATS_DETECTED = i18n.translate(
  'xpack.securitySolution.aiValue.threatsDetectedTitle',
  {
    defaultMessage: 'Real threats detected',
  }
);

export const THREATS_DETECTED_DESC = i18n.translate(
  'xpack.securitySolution.aiValue.threatsDetectedDesc',
  {
    defaultMessage: 'AI-identified genuine threats',
  }
);

export const ATTACK_DISCOVERY_COUNT = i18n.translate(
  'xpack.securitySolution.aiValue.attackDiscoveryCount',
  {
    defaultMessage: 'attack discovery count',
  }
);

export const FILTERING_RATE = i18n.translate('xpack.securitySolution.aiValue.filteringRate', {
  defaultMessage: 'Alert filtering rate',
});

export const FILTERING_RATE_DESC = i18n.translate(
  'xpack.securitySolution.aiValue.filteringRateDesc',
  {
    defaultMessage: 'AI-filtered false positives',
  }
);

export const ESCALATED_RATE = i18n.translate('xpack.securitySolution.aiValue.escalatedRate', {
  defaultMessage: 'Escalated alert rate',
});

export const ESCALATED_RATE_DESC = i18n.translate(
  'xpack.securitySolution.aiValue.escalatedRateDesc',
  {
    defaultMessage: 'AI-escalated alerts',
  }
);

export const TIME_SAVED = i18n.translate('xpack.securitySolution.aiValue.timeSavedTitle', {
  defaultMessage: 'Analyst time saved',
});

export const TIME_SAVED_DESC = i18n.translate('xpack.securitySolution.aiValue.timeSavedTitle', {
  defaultMessage: 'Time saved in hours',
});

export const RESPONSE_TIME_TITLE = i18n.translate(
  'xpack.securitySolution.aiValue.responseTimeTitle',
  {
    defaultMessage: 'Response time analysis',
  }
);

export const RESPONSE_TIME_DESC = i18n.translate(
  'xpack.securitySolution.aiValue.responseTimeDesc',
  {
    defaultMessage: 'Alert response times with AI assistance',
  }
);

export const ALERT_PROCESSING_TITLE = i18n.translate(
  'xpack.securitySolution.aiValue.alertProcessingTitle',
  {
    defaultMessage: 'Alert processing analytics',
  }
);

export const ALERT_PROCESSING_DESC = i18n.translate(
  'xpack.securitySolution.aiValue.alertProcessingDesc',
  {
    defaultMessage: 'AI alert handling breakdown',
  }
);
