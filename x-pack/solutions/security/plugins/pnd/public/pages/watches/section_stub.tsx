/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { PndPageSection } from '../../components/layout/pnd_page_section';
import { PndPageHeader } from '../../components/pnd_page_header';
import { usePndDocTitle } from '../../hooks/use_pnd_doc_title';
import type { WatchesSectionId } from './components/pnd_watches_nav';
import {
  WatchesSectionLayout,
  WatchesSubnavExpandControl,
} from './components/watches_section_layout';
import * as i18n from './translations';

interface WatchesSectionStubPageProps {
  section: Exclude<WatchesSectionId, 'watches'>;
}

const SECTION_COPY: Record<
  Exclude<WatchesSectionId, 'watches'>,
  { title: string; subtitle: string }
> = {
  workflows: { title: i18n.SUBNAV_WORKFLOWS, subtitle: i18n.STUB_WORKFLOWS_SUBTITLE },
  skills: { title: i18n.SUBNAV_SKILLS, subtitle: i18n.STUB_SKILLS_SUBTITLE },
  activity: { title: i18n.SUBNAV_ACTIVITY, subtitle: i18n.STUB_ACTIVITY_SUBTITLE },
  performance: { title: i18n.SUBNAV_PERFORMANCE, subtitle: i18n.STUB_PERFORMANCE_SUBTITLE },
  guardrails: { title: i18n.SUBNAV_GUARDRAILS, subtitle: i18n.STUB_GUARDRAILS_SUBTITLE },
};

export const WatchesSectionStubPage: React.FC<WatchesSectionStubPageProps> = ({ section }) => {
  const copy = SECTION_COPY[section];
  usePndDocTitle(copy.title);

  return (
    <WatchesSectionLayout active={section}>
      <PndPageSection>
        <PndPageHeader
          title={copy.title}
          subtitle={copy.subtitle}
          leftSideItems={[<WatchesSubnavExpandControl key="subnav-expand" />]}
        />
        <EuiEmptyPrompt
          iconType="aggregate"
          title={<h2>{i18n.STUB_EMPTY_TITLE}</h2>}
          body={<p>{i18n.STUB_EMPTY_BODY}</p>}
        />
      </PndPageSection>
    </WatchesSectionLayout>
  );
};
