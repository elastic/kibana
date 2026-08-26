/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KbnInfoCallout } from '@kbn/ui-callout';
import { usePndDocTitle } from '../../../hooks/use_pnd_doc_title';
import { usePndConfig } from '../../../hooks/use_pnd_config';
import { WATCHES_NAV_SKILLS_ID } from '../components/pnd_watches_nav';
import { WatchesSectionLayout } from '../components/watches_section_layout';
import { SkillsTable } from './skills_table';
import * as i18n from './translations';

export const SkillsPage: React.FC = () => {
  const {
    ui: { useMockData },
  } = usePndConfig();
  usePndDocTitle(i18n.PAGE_TITLE);

  return (
    <WatchesSectionLayout
      active={WATCHES_NAV_SKILLS_ID}
      title={i18n.PAGE_TITLE}
      description={i18n.PAGE_SUBTITLE}
    >
      {useMockData ? (
        <SkillsTable />
      ) : (
        <KbnInfoCallout
          announceOnMount
          title={i18n.NOT_IMPLEMENTED_TITLE}
          text={<p>{i18n.NOT_IMPLEMENTED_BODY}</p>}
          data-test-subj="pndSkillsNotImplemented"
        />
      )}
    </WatchesSectionLayout>
  );
};
