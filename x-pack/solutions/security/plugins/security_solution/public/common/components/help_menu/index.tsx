/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../lib/kibana';
import { SOLUTION_NAME } from '../../translations';

export const HelpMenu = React.memo(() => {
  const { chrome, docLinks } = useKibana().services;

  useEffect(() => {
    chrome.setHelpExtension({
      appName: SOLUTION_NAME,
      links: [
        {
          content: i18n.translate('xpack.securitySolution.chrome.helpMenu.documentation', {
            defaultMessage: 'Security documentation',
          }),
          href: docLinks.links.siem.guide,
          iconType: 'documents',
          linkType: 'custom',
          target: '_blank',
          rel: 'noopener',
        },
        {
          content: i18n.translate('xpack.securitySolution.chrome.helpMenu.documentation.ecs', {
            defaultMessage: 'ECS documentation',
          }),
          href: docLinks.links.ecs.guide,
          iconType: 'documents',
          linkType: 'custom',
          target: '_blank',
          rel: 'noopener',
        },
      ],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
});

HelpMenu.displayName = 'HelpMenu';
