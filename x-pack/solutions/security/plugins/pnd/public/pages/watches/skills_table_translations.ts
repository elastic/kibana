/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PAGE_TITLE = i18n.translate('xpack.pnd.watches.skills.pageTitle', {
  defaultMessage: 'Skills',
});

export const PAGE_SUBTITLE = i18n.translate('xpack.pnd.watches.skills.pageSubtitle', {
  defaultMessage: 'Capabilities a Watch’s Workers can call',
});

export const TABLE_CAPTION = i18n.translate('xpack.pnd.watches.skills.tableCaption', {
  defaultMessage: 'Skills available to Security Watches',
});

export const COL_SKILL = i18n.translate('xpack.pnd.watches.skills.col.skill', {
  defaultMessage: 'Skill',
});

export const COL_WATCHES = i18n.translate('xpack.pnd.watches.skills.col.watches', {
  defaultMessage: 'Watches',
});

export const COL_LAST_RUN = i18n.translate('xpack.pnd.watches.skills.col.lastRun', {
  defaultMessage: 'Last run',
});

export const COL_ENABLED = i18n.translate('xpack.pnd.watches.skills.col.enabled', {
  defaultMessage: 'Enabled',
});

export const NO_SKILLS = i18n.translate('xpack.pnd.watches.skills.empty', {
  defaultMessage: 'No skills are available yet.',
});

export const LOAD_ERROR = i18n.translate('xpack.pnd.watches.skills.loadError', {
  defaultMessage: 'Unable to load skills.',
});

export const NOT_IMPLEMENTED_TITLE = i18n.translate(
  'xpack.pnd.watches.skills.notImplemented.title',
  {
    defaultMessage: 'Skills are not implemented yet',
  }
);

export const NOT_IMPLEMENTED_BODY = i18n.translate('xpack.pnd.watches.skills.notImplemented.body', {
  defaultMessage:
    'The skill catalog has no durable storage in live mode. Open a Watch on the left to change its settings.',
});

export const enableSkillAriaLabel = (name: string) =>
  i18n.translate('xpack.pnd.watches.skills.enableAriaLabel', {
    defaultMessage: 'Enable skill {name}',
    values: { name },
  });

/**
 * Name and description per skill id. The API carries ids only, so all skill copy lives here.
 * Keep in step with `SKILLS_SEED` in `@kbn/pnd-common`.
 */
export const SKILL_NAMES: Record<string, string> = {
  'alert-triage': i18n.translate('xpack.pnd.watches.skills.alertTriage.name', {
    defaultMessage: 'Alert triage',
  }),
  'mitre-attack-mapping': i18n.translate('xpack.pnd.watches.skills.mitreAttackMapping.name', {
    defaultMessage: 'MITRE ATT&CK mapping',
  }),
  'dark-web-feeds': i18n.translate('xpack.pnd.watches.skills.darkWebFeeds.name', {
    defaultMessage: 'Dark web feeds',
  }),
  'virustotal-lookup': i18n.translate('xpack.pnd.watches.skills.virustotalLookup.name', {
    defaultMessage: 'VirusTotal lookup',
  }),
  'case-assembly': i18n.translate('xpack.pnd.watches.skills.caseAssembly.name', {
    defaultMessage: 'Case assembly',
  }),
  escalation: i18n.translate('xpack.pnd.watches.skills.escalation.name', {
    defaultMessage: 'Escalation',
  }),
  containment: i18n.translate('xpack.pnd.watches.skills.containment.name', {
    defaultMessage: 'Containment',
  }),
  'rule-preview': i18n.translate('xpack.pnd.watches.skills.rulePreview.name', {
    defaultMessage: 'Rule preview',
  }),
};

export const SKILL_DESCRIPTIONS: Record<string, string> = {
  'alert-triage': i18n.translate('xpack.pnd.watches.skills.alertTriage.description', {
    defaultMessage: 'Classifies and prioritizes alerts; proposes cases or suppressions.',
  }),
  'mitre-attack-mapping': i18n.translate(
    'xpack.pnd.watches.skills.mitreAttackMapping.description',
    {
      defaultMessage: 'Maps activity to ATT&CK tactics and techniques.',
    }
  ),
  'dark-web-feeds': i18n.translate('xpack.pnd.watches.skills.darkWebFeeds.description', {
    defaultMessage: 'Ingests dark-web mentions relevant to monitored assets.',
  }),
  'virustotal-lookup': i18n.translate('xpack.pnd.watches.skills.virustotalLookup.description', {
    defaultMessage: 'Looks up hashes and URLs; currently unavailable in pilot.',
  }),
  'case-assembly': i18n.translate('xpack.pnd.watches.skills.caseAssembly.description', {
    defaultMessage: 'Structures Floor drafts into reviewable cases.',
  }),
  escalation: i18n.translate('xpack.pnd.watches.skills.escalation.description', {
    defaultMessage: 'Routes high-severity paths to on-call or IR.',
  }),
  containment: i18n.translate('xpack.pnd.watches.skills.containment.description', {
    defaultMessage: 'Scoped isolation and block actions for trusted runtime paths.',
  }),
  'rule-preview': i18n.translate('xpack.pnd.watches.skills.rulePreview.description', {
    defaultMessage:
      'Automatically previews proposed rule changes or new rules against live data before review.',
  }),
};

export const skillName = (skillId: string): string => SKILL_NAMES[skillId] ?? skillId;
export const skillDescription = (skillId: string): string | undefined =>
  SKILL_DESCRIPTIONS[skillId];
