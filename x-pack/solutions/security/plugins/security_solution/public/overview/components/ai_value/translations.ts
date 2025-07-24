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

export const NO_CHANGE = (statType: string) =>
  i18n.translate('xpack.securitySolution.aiValue.noChange', {
    defaultMessage: 'Your {statType} is unchanged',
    values: { statType },
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

export const METRICS_OVER_TIME = (timeRange: string) =>
  i18n.translate('xpack.securitySolution.aiValue.metricsOverTime', {
    defaultMessage: 'Value report metrics shown below reflect the last {timeRange} days',
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
    defaultMessage: 'AI-filtered non-suspicious alerts',
  }
);

export const COMPARED = i18n.translate('xpack.securitySolution.aiValue.compared', {
  defaultMessage: 'Compared to the previous period',
});

export const NON_SUSPICIOUS = i18n.translate('xpack.securitySolution.aiValue.falsePositives', {
  defaultMessage: 'non-suspicious alerts',
});

export const ESCALATED_ALERTS = i18n.translate('xpack.securitySolution.aiValue.escalatedAlerts', {
  defaultMessage: 'Escalated alerts',
});

export const ESCALATED_RATE = i18n.translate('xpack.securitySolution.aiValue.escalatedRate', {
  defaultMessage: 'Escalated alert rate',
});

export const COST_CALCULATIONS = i18n.translate('xpack.securitySolution.aiValue.costCalculations', {
  defaultMessage: 'Cost calculations: Time saved × average analyst hourly rate: $75/h.',
});

export const TIME_SAVED = i18n.translate('xpack.securitySolution.aiValue.timeSavedTitle', {
  defaultMessage: 'Analyst time saved',
});

export const TIME_SAVED_DESC = i18n.translate('xpack.securitySolution.aiValue.timeSavedTitle', {
  defaultMessage: 'Time saved in hours',
});

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

export const EXECUTIVE_GREETING = (username: string) =>
  i18n.translate('xpack.securitySolution.aiValue.executiveGreeting', {
    defaultMessage: `Hi {username} - here is your executive summary`,
    values: { username },
  });
export const EXECUTIVE_MESSAGE_START = i18n.translate(
  'xpack.securitySolution.aiValue.executiveMessageStart',
  {
    defaultMessage: 'Elastic AI SOC Engine continues to deliver measurable ROI:',
  }
);

export const EXECUTIVE_COST_SAVINGS_LABEL = i18n.translate(
  'xpack.securitySolution.aiValue.executiveCostSavingsLabel',
  {
    defaultMessage: 'cost savings',
  }
);

export const EXECUTIVE_AND = i18n.translate('xpack.securitySolution.aiValue.executiveAnd', {
  defaultMessage: 'and',
});

export const EXECUTIVE_AND_A = i18n.translate('xpack.securitySolution.aiValue.executiveAndA', {
  defaultMessage: 'and a',
});

export const EXECUTIVE_HOURS_SAVED_LABEL = i18n.translate(
  'xpack.securitySolution.aiValue.executiveHoursSavedLabel',
  {
    defaultMessage: 'analyst hours saved',
  }
);

export const EXECUTIVE_MESSAGE_END = (timeRange: string) =>
  i18n.translate('xpack.securitySolution.aiValue.executiveMessageEnd', {
    defaultMessage: '{timeRange} — significantly increasing threat detection coverage.',
    values: { timeRange },
  });

export const EXECUTIVE_CALC = i18n.translate('xpack.securitySolution.aiValue.executiveCalc', {
  defaultMessage:
    'These results are based on automating alert triage, using an average review time of',
});

export const MINUTES_PER_ALERT = (minutes: string) =>
  i18n.translate('xpack.securitySolution.aiValue.executiveMinutes', {
    defaultMessage: '{minutes} minutes per alert',
    values: { minutes },
  });

export const ANALYST_RATE = (rate: string) =>
  i18n.translate('xpack.securitySolution.aiValue.executiveRate', {
    defaultMessage: '{rate}/hour analyst rate',
    values: { rate },
  });

export const EXECUTIVE_MESSAGE_SECOND = i18n.translate(
  'xpack.securitySolution.aiValue.executiveMessageSecond',
  {
    defaultMessage:
      'By reducing the manual burden of high-volume alert review, the AI SOC enhances efficiency, lowers operational costs, and enables teams to focus on higher-value security work. At the same time, it increases threat detection coverage — helping organizations respond faster, with fewer resources.',
  }
);

export const EXECUTIVE_COST_SAVINGS_DESC = i18n.translate(
  'xpack.securitySolution.aiValue.executiveCostSavingsDesc',
  {
    defaultMessage: 'cost savings from automated alert processing',
  }
);

export const EXECUTIVE_ALERT_FILTERING_DESC = i18n.translate(
  'xpack.securitySolution.aiValue.executiveAlertFilteringDesc',
  {
    defaultMessage: 'alert filtering rate, reducing analyst fatigue and noise',
  }
);

export const EXECUTIVE_HOURS_SAVED_DESC = i18n.translate(
  'xpack.securitySolution.aiValue.executiveHoursSavedDesc',
  {
    defaultMessage: 'analyst hours saved',
  }
);

export const EXECUTIVE_INCREASE = i18n.translate(
  'xpack.securitySolution.aiValue.executiveIncrease',
  {
    defaultMessage: 'increase',
  }
);

export const EXECUTIVE_DECREASE = i18n.translate(
  'xpack.securitySolution.aiValue.executiveDecrease',
  {
    defaultMessage: 'decrease',
  }
);

export const EXECUTIVE_THREATS_DETECTED_DESC = (isIncrease: boolean) =>
  i18n.translate('xpack.securitySolution.aiValue.executiveThreatsDetectedDesc', {
    defaultMessage: '{creaseType} in real threats detected, improving detection coverage',
    values: { creaseType: isIncrease ? EXECUTIVE_INCREASE : EXECUTIVE_DECREASE },
  });

export const RESPONSE_TIME_DESC = i18n.translate(
  'xpack.securitySolution.aiValue.responseTimeDesc',
  {
    defaultMessage: 'Alert response times with AI assistance',
  }
);
