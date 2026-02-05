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

export const COST_SAVINGS_TREND = i18n.translate(
  'xpack.securitySolution.reports.aiValue.costSavingsTrend',
  {
    defaultMessage: 'Cost savings trend',
  }
);

export const INSIGHTS_ERROR = i18n.translate(
  'xpack.securitySolution.reports.aiValue.insightsError',
  {
    defaultMessage: 'Failed to fetch insight data due to an error:',
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

export const COMPARED = i18n.translate('xpack.securitySolution.reports.aiValue.compared', {
  defaultMessage: 'Compared to the previous period:',
});

export const NON_SUSPICIOUS_ALERTS = i18n.translate(
  'xpack.securitySolution.reports.aiValue.falsePositives',
  {
    defaultMessage: 'Non-suspicious alerts',
  }
);
export const ESCALATED = i18n.translate('xpack.securitySolution.reports.aiValue.escalated', {
  defaultMessage: 'Escalated',
});

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

export const COST_SAVED_DESC = i18n.translate(
  'xpack.securitySolution.reports.aiValue.timeSavedTitle',
  {
    defaultMessage: 'Cost saved in dollars',
  }
);

export const ALERT_PROCESSING_TITLE = i18n.translate(
  'xpack.securitySolution.reports.aiValue.alertProcessingTitle',
  {
    defaultMessage: 'Alert processing analytics',
  }
);

export const EXECUTIVE_MESSAGE_NO_ATTACKS = i18n.translate(
  'xpack.securitySolution.reports.aiValue.executiveMessageNoAttacks',
  {
    defaultMessage:
      'There are no attack discoveries in the selected time range. Update your time range to include attack discoveries, or visit the attack discovery page to start generating attacks.',
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

export const FILTERED_ALERTS_2_NONE = i18n.translate(
  'xpack.securitySolution.aiValue.filteredAlerts2None',
  {
    defaultMessage:
      ' were automatically filtered out by AI, meaning analysts reviewed no alerts manually.',
  }
);

export const FILTERED_ALERTS_2_ALL = i18n.translate(
  'xpack.securitySolution.aiValue.filteredAlerts2All',
  {
    defaultMessage:
      ' were automatically filtered out by AI, meaning analysts reviewed all alerts manually.',
  }
);

export const ESCALATED_ALERTS_1 = ({ percentage, count }: { percentage: string; count: string }) =>
  i18n.translate('xpack.securitySolution.reports.aiValue.escalatedAlerts1', {
    defaultMessage: 'Focused escalations: Only {percentage} of alerts ({count})',
    values: { percentage, count },
  });

export const ESCALATED_ALERTS_1_ALL = ({
  percentage,
  count,
}: {
  percentage: string;
  count: string;
}) =>
  i18n.translate('xpack.securitySolution.reports.aiValue.escalatedAlerts1All', {
    defaultMessage: 'Focused escalations: {percentage} of alerts ({count})',
    values: { percentage, count },
  });

export const ESCALATED_ALERTS_1_NONE = ({
  percentage,
  count,
}: {
  percentage: string;
  count: string;
}) =>
  i18n.translate('xpack.securitySolution.reports.aiValue.escalatedAlerts1None', {
    defaultMessage: 'Focused escalations: {percentage} of alerts ({count})',
    values: { percentage, count },
  });

export const ESCALATED_ALERTS_2 = i18n.translate(
  'xpack.securitySolution.aiValue.escalatedAlerts2',
  {
    defaultMessage:
      ' were escalated for analyst review — highlighting that Elastic’s Attack Discovery surfaces only the alerts that matter and are more likely tied to actual threats',
  }
);

export const ESCALATED_ALERTS_2_ALL = i18n.translate(
  'xpack.securitySolution.aiValue.escalatedAlerts2All',
  {
    defaultMessage:
      ' were escalated for analyst review — indicating that Elastic’s Attack Discovery surfaced all alerts for investigation in this period',
  }
);

export const ESCALATED_ALERTS_2_NONE = i18n.translate(
  'xpack.securitySolution.aiValue.escalatedAlerts2None',
  {
    defaultMessage:
      ' were escalated for analyst review — indicating that Elastic’s Attack Discovery did not escalate any alerts in this period',
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

export const CHANGE_RATE_EXPORT_MODE = i18n.translate(
  'xpack.securitySolution.reports.aiValue.exportMode.changeRate',
  {
    defaultMessage: 'Value report rates configured in advanced settings.',
  }
);

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

export const TOTAL_ALERTS_PROCESSED = i18n.translate(
  'xpack.securitySolution.reports.aiValue.totalAlertsProcessed',
  {
    defaultMessage: 'Total alerts processed',
  }
);
