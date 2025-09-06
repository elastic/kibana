/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const UP = i18n.translate('xpack.securitySolution.reports.aiValue.up', {
  defaultMessage: 'up',
});

export const DOWN = i18n.translate('xpack.securitySolution.reports.aiValue.down', {
  defaultMessage: 'down',
});
export const COST_SAVINGS_TITLE = i18n.translate(
  'xpack.securitySolution.reports.aiValue.costSavingsTitle',
  {
    defaultMessage: 'Cost savings',
  }
);

export const COST_SAVINGS_TREND = i18n.translate(
  'xpack.securitySolution.reports.aiValue.costSavingsTrend',
  {
    defaultMessage: 'Cost savings trend',
  }
);

export const COST_SAVINGS_SOC = i18n.translate(
  'xpack.securitySolution.reports.aiValue.costSavingsSoc',
  {
    defaultMessage: 'Cumulative savings from AI-driven SOC operations',
  }
);

export const NO_CHANGE = (statType: string) =>
  i18n.translate('xpack.securitySolution.reports.aiValue.noChange', {
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
  i18n.translate('xpack.securitySolution.reports.aiValue.timeDifference', {
    defaultMessage: `Your {statType} is {upOrDown} by {percentageChange} from {stat}`,
    values: { upOrDown, percentageChange, stat, statType },
  });

export const TIME_RANGE = (timeRange: string) =>
  i18n.translate('xpack.securitySolution.reports.aiValue.timeRange', {
    defaultMessage: 'over the last {timeRange} days',
    values: { timeRange },
  });

export const METRICS_OVER_TIME = (timeRange: string) =>
  i18n.translate('xpack.securitySolution.reports.aiValue.metricsOverTime', {
    defaultMessage: 'Value report metrics shown below reflect the last {timeRange} days',
    values: { timeRange },
  });

export const ATTACK_DISCOVERY_COUNT = i18n.translate(
  'xpack.securitySolution.reports.aiValue.attackDiscoveryCount',
  {
    defaultMessage: 'attack discovery count',
  }
);

export const EXPORT_REPORT = i18n.translate('xpack.securitySolution.reports.aiValue.exportReport', {
  defaultMessage: 'Export report',
});

export const FILTERING_RATE = i18n.translate(
  'xpack.securitySolution.reports.aiValue.filteringRate',
  {
    defaultMessage: 'Alert filtering rate',
  }
);
export const FILTERING_RATE_DESC = i18n.translate(
  'xpack.securitySolution.aiValue.filteringRateDesc',
  {
    defaultMessage: 'AI-filtered non-suspicious alerts',
  }
);

export const COMPARED = i18n.translate('xpack.securitySolution.reports.aiValue.compared', {
  defaultMessage: 'Compared to the previous period:',
});

export const NON_SUSPICIOUS_ALERTS = i18n.translate(
  'xpack.securitySolution.reports.aiValue.falsePositives',
  {
    defaultMessage: 'Non-suspicious alerts',
  }
);

export const TOTAL_ALERTS_PROCESSED = i18n.translate(
  'xpack.securitySolution.reports.aiValue.totalAlertsProcessed',
  {
    defaultMessage: 'Total alerts processed',
  }
);

export const ESCALATED = i18n.translate('xpack.securitySolution.reports.aiValue.escalated', {
  defaultMessage: 'Escalated',
});

export const NON_SUSPICIOUS = i18n.translate(
  'xpack.securitySolution.reports.aiValue.nonSuspicious',
  {
    defaultMessage: 'non-suspicious',
  }
);

export const ESCALATED_ALERTS = i18n.translate(
  'xpack.securitySolution.reports.aiValue.escalatedAlerts',
  {
    defaultMessage: 'Escalated alerts',
  }
);

export const ESCALATED_RATE = i18n.translate(
  'xpack.securitySolution.reports.aiValue.escalatedRate',
  {
    defaultMessage: 'Escalated alert rate',
  }
);

export const TIME_SAVED = i18n.translate('xpack.securitySolution.reports.aiValue.timeSavedTitle', {
  defaultMessage: 'Analyst time saved',
});

export const TIME_SAVED_DESC = i18n.translate(
  'xpack.securitySolution.reports.aiValue.timeSavedTitle',
  {
    defaultMessage: 'Time saved in hours',
  }
);

export const ALERT_PROCESSING_TITLE = i18n.translate(
  'xpack.securitySolution.reports.aiValue.alertProcessingTitle',
  {
    defaultMessage: 'Alert processing analytics',
  }
);

export const ALERT_PROCESSING_DESC = i18n.translate(
  'xpack.securitySolution.reports.aiValue.alertProcessingDesc',
  {
    defaultMessage: 'AI alert handling breakdown',
  }
);

export const EXECUTIVE_GREETING = (username: string) =>
  i18n.translate('xpack.securitySolution.reports.aiValue.executiveGreeting', {
    defaultMessage: `Hi {username} - here is your executive summary`,
    values: { username },
  });
export const EXECUTIVE_MESSAGE_START = i18n.translate(
  'xpack.securitySolution.reports.aiValue.executiveMessageStart',
  {
    defaultMessage: 'The Elastic AI SOC Engine continues to deliver measurable impact, driving ',
  }
);

export const EXECUTIVE_COST_SAVINGS_LABEL = i18n.translate(
  'xpack.securitySolution.reports.aiValue.executiveCostSavingsLabel',
  {
    defaultMessage: 'in cost savings',
  }
);

export const EXECUTIVE_AND = i18n.translate('xpack.securitySolution.reports.aiValue.executiveAnd', {
  defaultMessage: 'and reclaiming',
});

export const EXECUTIVE_AND_A = i18n.translate(
  'xpack.securitySolution.reports.aiValue.executiveAndA',
  {
    defaultMessage: 'and a',
  }
);

export const EXECUTIVE_HOURS_SAVED_LABEL = i18n.translate(
  'xpack.securitySolution.reports.aiValue.executiveHoursSavedLabel',
  {
    defaultMessage: 'analyst hours',
  }
);

export const EXECUTIVE_MESSAGE_END = (timeRange: string) =>
  i18n.translate('xpack.securitySolution.reports.aiValue.executiveMessageEnd', {
    defaultMessage: '{timeRange} — significantly increasing threat detection coverage.',
    values: { timeRange },
  });

export const EXECUTIVE_FILTERING = i18n.translate(
  'xpack.securitySolution.reports.aiValue.executiveFiltering',
  {
    defaultMessage:
      'These results are based on AI-powered alert filtering that prevents analysts from spending time on non-suspicious alerts.',
  }
);

export const EXECUTIVE_CALC = i18n.translate(
  'xpack.securitySolution.reports.aiValue.executiveCalc',
  {
    defaultMessage:
      'Here’s how it works: alerts identified as part of attack discoveries are classified as ',
  }
);

export const EXECUTIVE_CALC2 = i18n.translate(
  'xpack.securitySolution.reports.aiValue.executiveCalc2',
  {
    defaultMessage:
      'By automatically filtering out non-suspicious alerts, the AI SOC reduces triage workload at scale. Cost savings are calculated by multiplying the number of total alerts by an average review time of',
  }
);

export const EXECUTIVE_SUSPICIOUS = i18n.translate(
  'xpack.securitySolution.reports.aiValue.executiveCalcEscalated',
  {
    defaultMessage: '(i.e., suspicious), while all others are considered',
  }
);

export const EXECUTIVE_CONVERT = i18n.translate(
  'xpack.securitySolution.reports.aiValue.executiveConvert',
  {
    defaultMessage: 'converting that time to hours, and applying a',
  }
);

export const MINUTES_PER_ALERT = (minutes: string) =>
  i18n.translate('xpack.securitySolution.reports.aiValue.executiveMinutes', {
    defaultMessage: '{minutes} minutes per alert',
    values: { minutes },
  });

export const ANALYST_RATE = (rate: string) =>
  i18n.translate('xpack.securitySolution.reports.aiValue.executiveRate', {
    defaultMessage: '{rate}/hour analyst rate',
    values: { rate },
  });

export const EXECUTIVE_MESSAGE_NO_ATTACKS = i18n.translate(
  'xpack.securitySolution.reports.aiValue.executiveMessageNoAttacks',
  {
    defaultMessage:
      'There are no attack discoveries in the selected time range. Update your time range to include attack discoveries, or visit the attack discovery page to start generating attacks.',
  }
);

export const EXECUTIVE_MESSAGE_SECOND = i18n.translate(
  'xpack.securitySolution.reports.aiValue.executiveMessageSecond',
  {
    defaultMessage:
      'The result: leaner SOC operations, increased threat coverage, and more time for analysts to focus on what matters most — investigating real threats.',
  }
);

export const EXECUTIVE_COST_SAVINGS_DESC = i18n.translate(
  'xpack.securitySolution.reports.aiValue.executiveCostSavingsDesc',
  {
    defaultMessage: 'cost savings from automated alert processing',
  }
);

export const EXECUTIVE_ALERT_FILTERING_DESC = i18n.translate(
  'xpack.securitySolution.reports.aiValue.executiveAlertFilteringDesc',
  {
    defaultMessage: 'alert filtering rate, reducing analyst fatigue and noise',
  }
);

export const EXECUTIVE_HOURS_SAVED_DESC = i18n.translate(
  'xpack.securitySolution.reports.aiValue.executiveHoursSavedDesc',
  {
    defaultMessage: 'analyst hours saved',
  }
);

export const EXECUTIVE_INCREASE = i18n.translate(
  'xpack.securitySolution.reports.aiValue.executiveIncrease',
  {
    defaultMessage: 'increase',
  }
);

export const EXECUTIVE_DECREASE = i18n.translate(
  'xpack.securitySolution.reports.aiValue.executiveDecrease',
  {
    defaultMessage: 'decrease',
  }
);

export const THREATS_DETECTED = i18n.translate(
  'xpack.securitySolution.aiValue.threatsDetectedTitle',
  {
    defaultMessage: 'Real threats detected',
  }
);

export const KEY_INSIGHT = i18n.translate('xpack.securitySolution.aiValue.keyInsight', {
  defaultMessage: 'Key Insight',
});

export const MINIMIZE_ALERT_FATIGUE = i18n.translate(
  'xpack.securitySolution.aiValue.minimizeFatigue',
  {
    defaultMessage:
      'Elastic’s Attack Discovery is effectively minimizing alert fatigue by filtering out the vast majority of noise, only escalating credible threats, and maintaining a very low false positive rate. This allows security teams to spend their time on true investigations instead of sifting through irrelevant alerts',
  }
);

export const FILTERED_ALERTS_1 = ({ percentage, count }: { percentage: string; count: string }) =>
  i18n.translate('xpack.securitySolution.reports.aiValue.filteredAlerts1', {
    defaultMessage: 'High automation efficiency: {percentage} of alerts ({count})',
    values: { percentage, count },
  });

export const FILTERED_ALERTS_2 = i18n.translate('xpack.securitySolution.aiValue.filteredAlerts2', {
  defaultMessage:
    ' were automatically filtered out by AI, meaning analysts didn’t have to review them manually. This drastically cuts down noise and routine triage work',
});

export const ESCALATED_ALERTS_1 = ({ percentage, count }: { percentage: string; count: string }) =>
  i18n.translate('xpack.securitySolution.reports.aiValue.escalatedAlerts1', {
    defaultMessage: 'Focused escalations: Only {percentage} of alerts ({count})',
    values: { percentage, count },
  });

export const ESCALATED_ALERTS_2 = i18n.translate(
  'xpack.securitySolution.aiValue.escalatedAlerts2',
  {
    defaultMessage:
      ' were escalated for analyst review — highlighting that Elastic’s Attack Discovery surfaces only the alerts that matter and are more likely tied to actual threats',
  }
);
export const EXECUTIVE_THREATS_DETECTED_DESC = (isIncrease: boolean) =>
  i18n.translate('xpack.securitySolution.reports.aiValue.executiveThreatsDetectedDesc', {
    defaultMessage: '{creaseType} in real threats detected, improving detection coverage',
    values: { creaseType: isIncrease ? EXECUTIVE_INCREASE : EXECUTIVE_DECREASE },
  });

export const EXECUTIVE_THREATS_DETECTED_DESC_NO_COMPARE = i18n.translate(
  'xpack.securitySolution.reports.aiValue.executiveThreatsDetectedDescNoCompare',
  {
    defaultMessage: 'real threats detected, improving detection coverage',
  }
);

export const AI_FILTERED = i18n.translate('xpack.securitySolution.reports.aiValue.aiFiltered', {
  defaultMessage: 'AI filtered',
});

export const COST_CALCULATIONS = i18n.translate(
  'xpack.securitySolution.reports.aiValue.costCalculations',
  {
    defaultMessage: 'Cost calculations',
  }
);

export const COST_CALCULATION = ({
  minutesPerAlert,
  analystHourlyRate,
}: {
  minutesPerAlert: number;
  analystHourlyRate: number;
}) =>
  i18n.translate('xpack.securitySolution.reports.aiValue.costCalculation', {
    defaultMessage:
      'Value is calculated by multiplying the total number of alerts by {minutesPerAlert} minutes each and then multiplying the result by a ${analystHourlyRate} per hour analyst rate.',
    values: { minutesPerAlert, analystHourlyRate },
  });

export const CHANGE_RATE = i18n.translate('xpack.securitySolution.reports.aiValue.changeRate', {
  defaultMessage: 'Change rate in advanced settings',
});

export const EDIT_TITLE = i18n.translate('xpack.securitySolution.reports.aiValue.editTitle', {
  defaultMessage: 'Edit title inline',
});

export const LEGAL_DISCLAIMER = i18n.translate(
  'xpack.securitySolution.reports.aiValue.legalDisclaimer',
  {
    defaultMessage:
      'The savings, figures, and estimates presented herein are for illustrative and informational purposes only. Individual results may vary significantly. This information is not, and should not be taken as, legal or financial advice to any person or company. Before making any decisions, consult with a qualified advisor. Elastic accepts no liability or responsibility whatsoever for any losses or liabilities allegedly arising from the use of this information.',
  }
);

export const EXECUTIVE_SUMMARY_SUBTITLE = i18n.translate(
  'xpack.securitySolution.reports.aiValue.executiveSummarySubtitle',
  {
    defaultMessage: 'Elastic AI SOC Engine continues to deliver measurable ROI: ',
  }
);

export const EXECUTIVE_SAVINGS_SUMMARY = ({
  costSavings,
  hoursSaved,
}: {
  costSavings: string;
  hoursSaved: string;
}) =>
  i18n.translate('xpack.securitySolution.reports.aiValue.executiveSavingsSummary', {
    defaultMessage: '{costSavings} cost savings and {hoursSaved} analyst hours saved',
    values: {
      costSavings,
      hoursSaved,
    },
  });

export const EXECUTIVE_SUMMARY_MAIN_TEXT = ({
  timeRange,
  minutesPerAlert,
  analystRate,
}: {
  timeRange: string;
  minutesPerAlert: number;
  analystRate: number;
}) =>
  i18n.translate('xpack.securitySolution.reports.aiValue.executiveSummaryMainText', {
    defaultMessage:
      ' over the last {timeRange} days — significantly increasing threat detection coverage. These results are based on automating alert triage, using an average review time of {minutesPerAlert} minutes per alert and a ${analystRate}/hour analyst rate.',
    values: {
      timeRange,
      minutesPerAlert,
      analystRate,
    },
  });

export const EXECUTIVE_SUMMARY_SECONDARY_TEXT = i18n.translate(
  'xpack.securitySolution.reports.aiValue.executiveSummarySecondaryText',
  {
    defaultMessage:
      'By reducing the manual burden of high-volume alert review, the AI SOC enhances efficiency, lowers operational costs, and enables teams to focus on higher-value security work. At the same time, it increases threat detection coverage — helping organizations respond faster, with fewer resources.',
  }
);

export const EXECUTIVE_SUMMARY_COST_SAVINGS_CARD_TITLE = i18n.translate(
  'xpack.securitySolution.reports.aiValue.executiveSummaryCostSavingsCardTitle',
  {
    defaultMessage: 'Cost savings',
  }
);

export const EXECUTIVE_SUMMARY_COST_SAVINGS_CARD_DESC = i18n.translate(
  'xpack.securitySolution.reports.aiValue.executiveSummaryCostSavingsCardDesc',
  {
    defaultMessage: 'Based on analyst time saved',
  }
);

export const EXECUTIVE_SUMMARY_ANALYST_HOURS_CARD_TITLE = i18n.translate(
  'xpack.securitySolution.reports.aiValue.executiveSummaryAnalystHoursCardTitle',
  {
    defaultMessage: 'Analyst hours saved',
  }
);

export const EXECUTIVE_SUMMARY_ANALYST_HOURS_CARD_DESC = i18n.translate(
  'xpack.securitySolution.reports.aiValue.executiveSummaryAnalystHoursCardDesc',
  {
    defaultMessage: 'Your time saved in hours is',
  }
);

export const EXECUTIVE_SUMMARY_ALERT_FILTERING_CARD_TITLE = i18n.translate(
  'xpack.securitySolution.reports.aiValue.executiveSummaryAlertFilteringCardTitle',
  {
    defaultMessage: 'Alert filtering rate',
  }
);

export const EXECUTIVE_SUMMARY_ALERT_FILTERING_CARD_DESC = i18n.translate(
  'xpack.securitySolution.reports.aiValue.executiveSummaryAlertFilteringCardDesc',
  {
    defaultMessage: 'Reducing analyst fatigue and noise. Your alert filtering rate is',
  }
);

export const EXECUTIVE_SUMMARY_THREATS_DETECTED_CARD_TITLE = i18n.translate(
  'xpack.securitySolution.reports.aiValue.executiveSummaryThreatsDetectedCardTitle',
  {
    defaultMessage: 'Real threats detected',
  }
);

export const EXECUTIVE_SUMMARY_THREATS_DETECTED_CARD_DESC = i18n.translate(
  'xpack.securitySolution.reports.aiValue.executiveSummaryThreatsDetectedCardDesc',
  {
    defaultMessage:
      'Increase in real threats detected, improving detection coverage. Your attack discovery count is',
  }
);

export const EXECUTIVE_SUMMARY_OVER_LAST_30_DAYS = i18n.translate(
  'xpack.securitySolution.reports.aiValue.executiveSummaryOverLast30Days',
  {
    defaultMessage: 'over the last 30 days',
  }
);

export const EXECUTIVE_SUMMARY_UP_BY = i18n.translate(
  'xpack.securitySolution.reports.aiValue.executiveSummaryUpBy',
  {
    defaultMessage: 'up by',
  }
);

export const EXECUTIVE_SUMMARY_DOWN_BY = i18n.translate(
  'xpack.securitySolution.reports.aiValue.executiveSummaryDownBy',
  {
    defaultMessage: 'down by',
  }
);

export const EXECUTIVE_SUMMARY_FROM = i18n.translate(
  'xpack.securitySolution.reports.aiValue.executiveSummaryFrom',
  {
    defaultMessage: 'from',
  }
);
