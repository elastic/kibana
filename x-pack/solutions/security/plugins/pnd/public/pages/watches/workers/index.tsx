/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { usePndDocTitle } from '../../../hooks/use_pnd_doc_title';
import { WATCHES_NAV_WORKERS_ID } from '../components/pnd_watches_nav';
import { WatchesSectionLayout } from '../components/watches_section_layout';
import { WorkersTable } from './workers_table';
import * as i18n from './translations';

export const WorkersPage: React.FC = () => {
  usePndDocTitle(i18n.PAGE_TITLE);

  return (
    <WatchesSectionLayout
      active={WATCHES_NAV_WORKERS_ID}
      title={i18n.PAGE_TITLE}
      description={i18n.PAGE_SUBTITLE}
    >
      <WorkersTable />
    </WatchesSectionLayout>
  );
};
