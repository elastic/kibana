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
  defaultMessage: "Let's get AlertZero working for you!",
});

export const ONBOARDING_DOC_TITLE = i18n.translate('xpack.alertzero.onboarding.docTitle', {
  defaultMessage: 'Set up Watches',
});

export const ONBOARDING_INTRO_GREETING = i18n.translate(
  'xpack.alertzero.onboarding.intro.greeting',
  { defaultMessage: "Hello, I'm AlertZero." }
);

export const ONBOARDING_INTRO_HEADING = i18n.translate('xpack.alertzero.onboarding.intro.heading', {
  defaultMessage: "Let's add your data!",
});

export const ONBOARDING_WATCHES_HEADING = i18n.translate(
  'xpack.alertzero.onboarding.introHeading',
  {
    defaultMessage: 'Choose your Workers',
  }
);

export const WATCH_SETTINGS = i18n.translate('xpack.alertzero.onboarding.watchSettings', {
  defaultMessage: 'Watch settings',
});

export const ONBOARDING_KEEP_ALL_ENABLED_NOTE = i18n.translate(
  'xpack.alertzero.onboarding.keepAllEnabledNote',
  { defaultMessage: 'We recommend turning on all Workers.' }
);

export const ONBOARDING_WORKERS_FOOTNOTE = i18n.translate(
  'xpack.alertzero.onboarding.workersFootnote',
  {
    defaultMessage: 'Select at least one to continue.',
  }
);

export const ONBOARDING_NO_WORKERS_AVAILABLE = i18n.translate(
  'xpack.alertzero.onboarding.noWorkersAvailable',
  {
    defaultMessage:
      'No Workers are available with your current subscription. Contact your administrator for access.',
  }
);

export const ENABLE_AND_RUN = i18n.translate('xpack.alertzero.onboarding.enableAndRun', {
  defaultMessage: 'Enable and run',
});

export const READ_MORE = i18n.translate('xpack.alertzero.onboarding.readMore', {
  defaultMessage: 'Read more about Watches',
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
      'You need the manage_security cluster privilege to turn on Workers. Ask an administrator to grant it.',
  }
);

export const NO_MODEL_CALLOUT_TITLE = i18n.translate(
  'xpack.alertzero.onboarding.noModelCallout.title',
  { defaultMessage: "AI models aren't set up for this space" }
);

export const NO_MODEL_CALLOUT_TEXT = i18n.translate(
  'xpack.alertzero.onboarding.noModelCallout.text',
  {
    defaultMessage:
      'Workers need AI models to run. Choose your models in Feature settings, then come back to turn on Workers.',
  }
);

export const NO_MODEL_CALLOUT_ACTION = i18n.translate(
  'xpack.alertzero.onboarding.noModelCallout.action',
  { defaultMessage: 'Open Feature settings' }
);

export const ONBOARDING_CONTINUE_REQUIRES_WRITE = i18n.translate(
  'xpack.alertzero.onboarding.continueRequiresWrite',
  {
    defaultMessage:
      'You need the All privilege for AlertZero to set up Watches. Ask an administrator to grant it.',
  }
);

// Onboarding-specific one-line descriptions, separate from the technical worker descriptions used
// on the Watch settings page.
const ONBOARDING_WORKER_DESCRIPTIONS: Record<string, string> = {
  [SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID]: i18n.translate(
    'xpack.alertzero.onboarding.workerDescription.attackDiscovery',
    {
      defaultMessage:
        "Finds potential attacks in your alerts, opens an investigation for each, and proposes forensic analysis of the affected hosts for any that aren't false positives.",
    }
  ),
  [SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID]: i18n.translate(
    'xpack.alertzero.onboarding.workerDescription.alertTriage',
    {
      defaultMessage:
        'Classifies new alerts and proposes closing false positives, so Attack Discovery has less noise to analyze.',
    }
  ),
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID]: i18n.translate(
    'xpack.alertzero.onboarding.workerDescription.ruleTuning',
    {
      defaultMessage:
        'Finds rules that are too noisy or too narrow, and proposes tuning changes tested against past data.',
    }
  ),
  [SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID]: i18n.translate(
    'xpack.alertzero.onboarding.workerDescription.endpointAnalysis',
    {
      defaultMessage:
        'Analyzes the affected hosts for attacks that Attack Discovery hands off, and proposes response actions such as isolating a host.',
    }
  ),
  [SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID]: i18n.translate(
    'xpack.alertzero.onboarding.workerDescription.continuousThreatHunt',
    {
      defaultMessage:
        'Searches your data for activity that matches threat reports, and opens an investigation for each match.',
    }
  ),
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID]: i18n.translate(
    'xpack.alertzero.onboarding.workerDescription.ruleCoverage',
    {
      defaultMessage:
        "Reviews detection gaps that Continuous Threat Hunt finds, and proposes rules to close them, either new ones or existing ones you haven't turned on.",
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
    { defaultMessage: 'On handoff from Attack Discovery' }
  ),
};

export const onboardingWorkerEventTrigger = (workerId: string): string | undefined =>
  ONBOARDING_WORKER_EVENT_TRIGGERS[workerId];

export const INTRO_PROMO_LEAD = i18n.translate('xpack.alertzero.onboarding.intro.promoLead', {
  defaultMessage: 'AlertZero works for you around the clock.',
});

export const INTRO_PROMO_BODY = i18n.translate('xpack.alertzero.onboarding.intro.promoBody', {
  defaultMessage:
    'Once your data is in, AlertZero takes the first pass at your alert queue. It flags false positives, hunts for threats, and investigates potential attacks, then recommends next steps for you to approve or decline.',
});

export const INTRO_READ_MORE = i18n.translate('xpack.alertzero.onboarding.intro.readMore', {
  defaultMessage: 'Read more about AlertZero',
});

export const INTRO_PREVIEW_HEADING = i18n.translate(
  'xpack.alertzero.onboarding.intro.previewHeading',
  { defaultMessage: 'Once your data is in, AlertZero will:' }
);

export const INTRO_SET_UP_DATA_TITLE = i18n.translate(
  'xpack.alertzero.onboarding.intro.setUpDataTitle',
  { defaultMessage: 'Get started with your data' }
);

export const INTRO_SET_UP_DATA_BODY = i18n.translate(
  'xpack.alertzero.onboarding.intro.setUpDataBody',
  {
    defaultMessage:
      "The Get started page walks you through connecting endpoint, identity, cloud, and network data, and confirms that it's flowing. Any Elastic integration works, and the more you connect, the more AlertZero can see.",
  }
);

export const INTRO_SET_UP_DATA_LINK = i18n.translate(
  'xpack.alertzero.onboarding.intro.setUpDataLink',
  { defaultMessage: 'Add data' }
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
      defaultMessage: 'Let you decide on the things that matter',
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
              "MFA was satisfied from two countries in 40 minutes, which suggests a replayed session cookie. Elastic Defend on the CFO's laptop shows an unsigned launch agent reading the browser cookie store at 13:39.",
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
              'In four minutes, fin-ws-31 requested 19 SPN tickets for svc-helpdesk and svc-backup, all downgraded to RC4 so an attacker can crack them offline.',
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
              "hr-admin granted finance-sync Mail.ReadWrite and offline_access on the payroll mailbox. There's no matching ticket, and the publisher was verified only this morning.",
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
      defaultMessage: 'Run investigations end to end and propose next steps',
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
              "Endpoint Analysis found an unsigned service on \\\\.\\pipe\\msupdate and proposes isolating the host so the implant can't reach out while the service is removed.",
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
              'Endpoint Analysis posted a follow-up after close: inspect the GPO that pushed the scheduled task.',
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
              "KRBTGT was last rotated 412 days ago, so a ticket forged tonight would still validate. Nothing shows that one has been, but it's worth confirming before it matters.",
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
              "The previous attempt to disable it failed because the service account isn't an org owner. An org owner has since granted admin:org, so disabling it now stops the app from minting another PAT.",
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
              "Require admin consent for Graph mail scopes so an hr-admin grant can't happen again.",
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
              'Continuous Threat Hunt found LSASS access from an unbacked module on eng-ws-06 that no rule covers. Rule Coverage proposes a new rule to close the gap.',
          }
        ),
      },
    ],
  },
];

export const ONBOARDING_WORKER_TOGGLE_ON = i18n.translate(
  'xpack.alertzero.onboarding.workerToggleOnLabel',
  { defaultMessage: 'On' }
);

export const ONBOARDING_WORKER_TOGGLE_OFF = i18n.translate(
  'xpack.alertzero.onboarding.workerToggleOffLabel',
  { defaultMessage: 'Off' }
);
