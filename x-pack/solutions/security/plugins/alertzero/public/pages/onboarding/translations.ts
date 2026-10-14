/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
} from '@kbn/alertzero-common';

export const ONBOARDING_GREETING = i18n.translate('xpack.alertzero.onboarding.greeting', {
  defaultMessage: 'Your data is coming in.',
});

export const ONBOARDING_TITLE = i18n.translate('xpack.alertzero.onboarding.title', {
  defaultMessage: "Let's turn on the Watches?",
});

export const ONBOARDING_INTRO_GREETING = i18n.translate(
  'xpack.alertzero.onboarding.intro.greeting',
  { defaultMessage: "Hello, I'm AlertZero." }
);

export const ONBOARDING_INTRO_HEADING = i18n.translate('xpack.alertzero.onboarding.intro.heading', {
  defaultMessage: "Let's add your data?",
});

export const ONBOARDING_WATCHES_HEADING = i18n.translate(
  'xpack.alertzero.onboarding.introHeading',
  {
    defaultMessage: 'Watches are how AlertZero works for you',
  }
);

export const WATCH_SETTINGS = i18n.translate('xpack.alertzero.onboarding.watchSettings', {
  defaultMessage: 'Watch settings',
});

export const ONBOARDING_KEEP_ALL_ENABLED_NOTE = i18n.translate(
  'xpack.alertzero.onboarding.keepAllEnabledNote',
  { defaultMessage: 'We recommend keeping all Watches enabled.' }
);

export const ONBOARDING_WORKERS_FOOTNOTE = i18n.translate(
  'xpack.alertzero.onboarding.workersFootnote',
  {
    defaultMessage: 'Enable acts on the checked set; at least one must stay checked.',
  }
);

export const ONBOARDING_NO_WORKERS_AVAILABLE = i18n.translate(
  'xpack.alertzero.onboarding.noWorkersAvailable',
  {
    defaultMessage:
      'No workers are available for your current subscription. Contact your administrator to enable additional features.',
  }
);

export const ENABLE_AND_RUN = i18n.translate('xpack.alertzero.onboarding.enableAndRun', {
  defaultMessage: 'Enable and run',
});

export const READ_MORE = i18n.translate('xpack.alertzero.onboarding.readMore', {
  defaultMessage: 'Read more about Watches in the documentation',
});

export const workersSelectedCount = (selected: number, total: number) =>
  i18n.translate('xpack.alertzero.onboarding.workersSelectedCount', {
    defaultMessage: '{selected} of {total} Workers selected',
    values: { selected, total },
  });

export const SERVICE_ACCOUNT_SETUP_FAILED_TITLE = i18n.translate(
  'xpack.alertzero.onboarding.serviceAccountSetupFailedTitle',
  {
    defaultMessage: "Some Workers weren't turned on",
  }
);

export const serviceAccountSetupFailedText = (failures: string) =>
  i18n.translate('xpack.alertzero.onboarding.serviceAccountSetupFailedText', {
    defaultMessage:
      "AlertZero couldn't set up their service accounts. {failures}. Select Enable and run to try again.",
    values: { failures },
  });

export const BACK = i18n.translate('xpack.alertzero.onboarding.back', {
  defaultMessage: 'Back',
});

export const ONBOARDING_MODIFY_FORBIDDEN = i18n.translate(
  'xpack.alertzero.onboarding.modifyForbiddenCallout',
  {
    defaultMessage:
      'You need the manage_security cluster privilege to enable workers. Ask an administrator.',
  }
);

export const ONBOARDING_CONTINUE_REQUIRES_WRITE = i18n.translate(
  'xpack.alertzero.onboarding.continueRequiresWrite',
  {
    defaultMessage:
      'You need the AlertZero All privilege to set up Watches. Ask an administrator to enable them.',
  }
);

// Onboarding-specific one-line descriptions, separate from the technical worker descriptions used
// on the Watch settings page.
const ONBOARDING_WORKER_DESCRIPTIONS: Record<string, string> = {
  [SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID]: i18n.translate(
    'xpack.alertzero.onboarding.workerDescription.attackDiscovery',
    {
      defaultMessage:
        'Finds candidate attacks on its schedule, opens an Investigation for each, and sends true positives to forensics.',
    }
  ),
  [SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID]: i18n.translate(
    'xpack.alertzero.onboarding.workerDescription.alertTriage',
    {
      defaultMessage:
        'Classifies each batch of alerts a rule execution generates, and reduces the noise Attack Discovery has to analyze.',
    }
  ),
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID]: i18n.translate(
    'xpack.alertzero.onboarding.workerDescription.ruleTuning',
    {
      defaultMessage:
        'Diagnoses noisy or under-covering rules and produces a tuning proposal with a backtest.',
    }
  ),
  [SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID]: i18n.translate(
    'xpack.alertzero.onboarding.workerDescription.endpointAnalysis',
    {
      defaultMessage:
        'Runs deeper forensics on the hosts from a promoted attack and proposes response actions.',
    }
  ),
  [SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID]: i18n.translate(
    'xpack.alertzero.onboarding.workerDescription.continuousThreatHunt',
    {
      defaultMessage:
        'Hunts previously ingested threat reports for matching and related activity, and opens an Investigation for anything it finds.',
    }
  ),
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID]: i18n.translate(
    'xpack.alertzero.onboarding.workerDescription.ruleCoverage',
    {
      defaultMessage:
        'Assesses detection gaps surfaced by Hunt Watch and proposes new or existing rules to close them.',
    }
  ),
};

export const onboardingWorkerDescription = (workerId: string): string | undefined =>
  ONBOARDING_WORKER_DESCRIPTIONS[workerId];

// Workers without a schedule interval are event-driven; schedule-driven ones use the cadence label.
const ONBOARDING_WORKER_EVENT_TRIGGERS: Record<string, string> = {
  [SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID]: i18n.translate(
    'xpack.alertzero.onboarding.workerTrigger.alertTriage',
    { defaultMessage: 'On new alerts' }
  ),
  [SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID]: i18n.translate(
    'xpack.alertzero.onboarding.workerTrigger.endpointAnalysis',
    { defaultMessage: 'On Attack Discovery promotion' }
  ),
};

export const onboardingWorkerEventTrigger = (workerId: string): string | undefined =>
  ONBOARDING_WORKER_EVENT_TRIGGERS[workerId];

export const INTRO_PROMO_LEAD = i18n.translate('xpack.alertzero.onboarding.intro.promoLead', {
  defaultMessage: 'AlertZero is a coworker that is always there — always working for you.',
});

export const INTRO_PROMO_BODY = i18n.translate('xpack.alertzero.onboarding.intro.promoBody', {
  defaultMessage:
    'Once your data is in, its Watches triage alerts, hunt for threats, tune noisy rules, and investigate on their own — around the clock. You only see the actions that need a human.',
});

export const INTRO_READ_MORE = i18n.translate('xpack.alertzero.onboarding.intro.readMore', {
  defaultMessage: 'Read more about AlertZero',
});

export const INTRO_PREVIEW_HEADING = i18n.translate(
  'xpack.alertzero.onboarding.intro.previewHeading',
  { defaultMessage: 'Once I have data, I will:' }
);

export const INTRO_SET_UP_DATA_TITLE = i18n.translate(
  'xpack.alertzero.onboarding.intro.setUpDataTitle',
  { defaultMessage: 'Get started with your data' }
);

export const INTRO_SET_UP_DATA_BODY = i18n.translate(
  'xpack.alertzero.onboarding.intro.setUpDataBody',
  {
    defaultMessage:
      'Getting started walks you through connecting your first sources — endpoint, identity, cloud, and network — and confirms the data is flowing. Any Elastic integration works; the more you connect, the more the Watches can see.',
  }
);

export const INTRO_SET_UP_DATA_LINK = i18n.translate(
  'xpack.alertzero.onboarding.intro.setUpDataLink',
  { defaultMessage: 'Open Getting started' }
);

export const CONTINUE = i18n.translate('xpack.alertzero.onboarding.continue', {
  defaultMessage: 'Continue',
});

export const PREVIEW_TABLIST_LABEL = i18n.translate(
  'xpack.alertzero.onboarding.preview.tablistLabel',
  { defaultMessage: 'Example queue sections' }
);

export const PREVIEW_REOPENED = i18n.translate('xpack.alertzero.onboarding.preview.reopened', {
  defaultMessage: 'Reopened',
});

export const VIDEO_PLACEHOLDER_LABEL = i18n.translate(
  'xpack.alertzero.onboarding.intro.videoPlaceholderLabel',
  { defaultMessage: 'Play: AlertZero in 90 seconds (video placeholder)' }
);

export interface PreviewItem {
  readonly age: string;
  readonly reopened: boolean;
  readonly title: string;
  readonly description: string;
}

export interface PreviewSlide {
  readonly id: string;
  readonly label: string;
  readonly subtitle: string;
  readonly count: number;
  readonly badgeColor: 'danger' | 'warning' | 'primary';
  readonly items: readonly PreviewItem[];
}

export const PREVIEW_SLIDES: readonly PreviewSlide[] = [
  {
    id: 'respond',
    label: i18n.translate('xpack.alertzero.onboarding.preview.respond.label', {
      defaultMessage: 'Respond',
    }),
    subtitle: i18n.translate('xpack.alertzero.onboarding.preview.respond.subtitle', {
      defaultMessage: 'Let you decide on the things that really matter',
    }),
    count: 5,
    badgeColor: 'danger',
    items: [
      {
        age: i18n.translate('xpack.alertzero.onboarding.preview.respond.item1.age', {
          defaultMessage: '10 min ago',
        }),
        reopened: false,
        title: i18n.translate('xpack.alertzero.onboarding.preview.respond.item1.title', {
          defaultMessage: 'Impossible travel — exec account (cfo@corp)',
        }),
        description: i18n.translate(
          'xpack.alertzero.onboarding.preview.respond.item1.description',
          {
            defaultMessage:
              "MFA was satisfied from two countries in 40 minutes — a replayed session cookie. Elastic Defend on the CFO's laptop shows an unsigned launch agent reading the browser cookie store at 13:39.",
          }
        ),
      },
      {
        age: i18n.translate('xpack.alertzero.onboarding.preview.respond.item2.age', {
          defaultMessage: '18 min ago',
        }),
        reopened: false,
        title: i18n.translate('xpack.alertzero.onboarding.preview.respond.item2.title', {
          defaultMessage: 'Kerberoasting against service accounts — fin-dc-01',
        }),
        description: i18n.translate(
          'xpack.alertzero.onboarding.preview.respond.item2.description',
          {
            defaultMessage:
              '19 SPN ticket requests for svc-helpdesk and svc-backup in four minutes from fin-ws-31, all downgraded to RC4 — offline cracking is the point.',
          }
        ),
      },
      {
        age: i18n.translate('xpack.alertzero.onboarding.preview.respond.item3.age', {
          defaultMessage: '26 min ago',
        }),
        reopened: false,
        title: i18n.translate('xpack.alertzero.onboarding.preview.respond.item3.title', {
          defaultMessage: 'Suspicious OAuth consent — hr-admin',
        }),
        description: i18n.translate(
          'xpack.alertzero.onboarding.preview.respond.item3.description',
          {
            defaultMessage:
              'hr-admin granted finance-sync Mail.ReadWrite and offline_access on the payroll mailbox — no ticket, publisher verified this morning.',
          }
        ),
      },
    ],
  },
  {
    id: 'investigate',
    label: i18n.translate('xpack.alertzero.onboarding.preview.investigate.label', {
      defaultMessage: 'Investigate',
    }),
    subtitle: i18n.translate('xpack.alertzero.onboarding.preview.investigate.subtitle', {
      defaultMessage: 'Run investigations end to end and close what I can',
    }),
    count: 4,
    badgeColor: 'warning',
    items: [
      {
        age: i18n.translate('xpack.alertzero.onboarding.preview.investigate.item1.age', {
          defaultMessage: '8 min ago',
        }),
        reopened: false,
        title: i18n.translate('xpack.alertzero.onboarding.preview.investigate.item1.title', {
          defaultMessage: 'Named-pipe backdoor — eng-ws-19',
        }),
        description: i18n.translate(
          'xpack.alertzero.onboarding.preview.investigate.item1.description',
          {
            defaultMessage:
              'Forensics pass on eng-ws-19 found an unsigned service on \\\\.\\pipe\\msupdate. Isolate is staged so the implant cannot reach out while the service is pulled.',
          }
        ),
      },
      {
        age: i18n.translate('xpack.alertzero.onboarding.preview.investigate.item2.age', {
          defaultMessage: '12 min ago',
        }),
        reopened: true,
        title: i18n.translate('xpack.alertzero.onboarding.preview.investigate.item2.title', {
          defaultMessage: 'Scheduled task persistence — helpdesk-ws-04',
        }),
        description: i18n.translate(
          'xpack.alertzero.onboarding.preview.investigate.item2.description',
          {
            defaultMessage:
              'Endpoint analysis posted a follow-up after close: inspect the GPO that pushed the scheduled task.',
          }
        ),
      },
      {
        age: i18n.translate('xpack.alertzero.onboarding.preview.investigate.item3.age', {
          defaultMessage: '22 min ago',
        }),
        reopened: false,
        title: i18n.translate('xpack.alertzero.onboarding.preview.investigate.item3.title', {
          defaultMessage: 'KRBTGT password age — fin-dc-01',
        }),
        description: i18n.translate(
          'xpack.alertzero.onboarding.preview.investigate.item3.description',
          {
            defaultMessage:
              'KRBTGT last rotated 412 days ago — a forged ticket from tonight would still validate. Worth proving before it matters.',
          }
        ),
      },
    ],
  },
  {
    id: 'configure',
    label: i18n.translate('xpack.alertzero.onboarding.preview.configure.label', {
      defaultMessage: 'Configure',
    }),
    subtitle: i18n.translate('xpack.alertzero.onboarding.preview.configure.subtitle', {
      defaultMessage: 'Help you prevent the next incident',
    }),
    count: 6,
    badgeColor: 'primary',
    items: [
      {
        age: i18n.translate('xpack.alertzero.onboarding.preview.configure.item1.age', {
          defaultMessage: '10 min ago',
        }),
        reopened: false,
        title: i18n.translate('xpack.alertzero.onboarding.preview.configure.item1.title', {
          defaultMessage: 'Orphaned GitHub PAT — eng-ci',
        }),
        description: i18n.translate(
          'xpack.alertzero.onboarding.preview.configure.item1.description',
          {
            defaultMessage:
              'The previous disable failed because the service account is not an org owner. An org owner granted admin:org — disabling now prevents the app from minting another PAT.',
          }
        ),
      },
      {
        age: i18n.translate('xpack.alertzero.onboarding.preview.configure.item2.age', {
          defaultMessage: '26 min ago',
        }),
        reopened: false,
        title: i18n.translate('xpack.alertzero.onboarding.preview.configure.item2.title', {
          defaultMessage: 'Suspicious OAuth consent — hr-admin',
        }),
        description: i18n.translate(
          'xpack.alertzero.onboarding.preview.configure.item2.description',
          {
            defaultMessage:
              'Require admin consent for Graph mail scopes so an hr-admin grant cannot recur.',
          }
        ),
      },
      {
        age: i18n.translate('xpack.alertzero.onboarding.preview.configure.item3.age', {
          defaultMessage: '26 min ago',
        }),
        reopened: false,
        title: i18n.translate('xpack.alertzero.onboarding.preview.configure.item3.title', {
          defaultMessage: 'Coverage gap — LSASS memory access from unbacked module',
        }),
        description: i18n.translate(
          'xpack.alertzero.onboarding.preview.configure.item3.description',
          {
            defaultMessage:
              'Hunt found LSASS access from an unbacked module on eng-ws-06 with no covering rule. Rule coverage drafted one — enabling it closes the gap.',
          }
        ),
      },
    ],
  },
];
