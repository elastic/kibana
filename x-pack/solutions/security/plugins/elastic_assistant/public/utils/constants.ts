export const APP_ID = 'securitySolution' as const;
export const APP_UI_ID = 'securitySolutionUI' as const;
export const LOCAL_STORAGE_KEY = `securityAssistant`;

export const PROMPT_CONTEXT_ALERT_CATEGORY = 'alert';
export const PROMPT_CONTEXT_EVENT_CATEGORY = 'event';
export const PROMPT_CONTEXT_DETECTION_RULES_CATEGORY = 'detection-rules';
export const SECURITY_FEATURE_ID = 'siemV2' as const;
export const ASSISTANT_FEATURE_ID = 'securitySolutionAssistant' as const;

export const URL_PARAM_KEY = {
  appQuery: 'query',
  /** @deprecated */
  eventFlyout: 'eventFlyout', // TODO remove when we assume it's been long enough that all users should use the newer `flyout` key
  flyout: 'flyout',
  timelineFlyout: 'timelineFlyout',
  filters: 'filters',
  savedQuery: 'savedQuery',
  sourcerer: 'sourcerer',
  timeline: 'timeline',
  timerange: 'timerange',
  pageFilter: 'pageFilters',
  rulesTable: 'rulesTable',
} as const;

export const FILTER_OPEN_ALERTS = 'open';

export const FILTER_ACKNOWLEDGED_ALERTS = 'acknowledged';

