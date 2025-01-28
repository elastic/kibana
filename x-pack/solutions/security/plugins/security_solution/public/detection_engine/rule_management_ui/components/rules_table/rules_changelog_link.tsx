/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiLink } from '@elastic/eui';
import React from 'react';
import { useKibana } from '../../../../common/lib/kibana';
import * as i18n from '../../../../detections/pages/detection_engine/rules/translations';

export const RulesChangelogLink = React.memo(() => {
  const { docLinks } = useKibana().services;

  return (
    <EuiLink
      href={docLinks.links.siem.ruleChangeLog}
      target="_blank"
      external
      data-test-subj="rules-changelog-link"
    >
      {i18n.RULE_UPDATES_DOCUMENTATION_LINK}
    </EuiLink>
  );
});

RulesChangelogLink.displayName = 'RulesChangelogLink';
