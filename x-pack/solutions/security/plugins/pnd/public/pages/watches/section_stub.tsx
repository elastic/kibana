/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiText } from '@elastic/eui';
import { PndPageSection } from '../../components/layout/pnd_page_section';
import { usePndDocTitle } from '../../hooks/use_pnd_doc_title';
import { WatchesSectionLayout } from './components/watches_section_layout';
import * as i18n from './translations';

const SECTION_COPY: Record<string, { title: string; subtitle: string }> = {
  performance: {
    title: i18n.SUBNAV_PERFORMANCE,
    subtitle: i18n.STUB_PERFORMANCE_SUBTITLE,
  },
  workflows: {
    title: i18n.SUBNAV_WORKFLOWS,
    subtitle: i18n.STUB_WORKFLOWS_SUBTITLE,
  },
  skills: {
    title: i18n.SUBNAV_SKILLS,
    subtitle: i18n.STUB_SKILLS_SUBTITLE,
  },
  activity: {
    title: i18n.SUBNAV_ACTIVITY,
    subtitle: i18n.STUB_ACTIVITY_SUBTITLE,
  },
  guardrails: {
    title: i18n.SUBNAV_GUARDRAILS,
    subtitle: i18n.STUB_GUARDRAILS_SUBTITLE,
  },
};

interface WatchesSectionStubPageProps {
  section: string;
}

export const WatchesSectionStubPage: React.FC<WatchesSectionStubPageProps> = ({ section }) => {
  const copy = SECTION_COPY[section] ?? {
    title: i18n.STUB_EMPTY_TITLE,
    subtitle: i18n.STUB_EMPTY_BODY,
  };
  usePndDocTitle(copy.title);

  return (
    <WatchesSectionLayout active={section} title={copy.title} description={copy.subtitle}>
      <PndPageSection>
        <EuiEmptyPrompt
          iconType="aggregate"
          title={<h2>{i18n.STUB_EMPTY_TITLE}</h2>}
          body={
            <EuiText color="subdued" size="s">
              <p>{i18n.STUB_EMPTY_BODY}</p>
            </EuiText>
          }
        />
      </PndPageSection>
    </WatchesSectionLayout>
  );
};
