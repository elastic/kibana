/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { useKibana } from '../../hooks/use_kibana';
import { NightshiftSearchHomepageBody } from './nightshift_search_homepage_body';

/**
 * Renders the Search homepage at `/app/elasticsearch/home`.
 *
 * The page body is the Nightshift-style Search surface — header avatar
 * + title + description, an Overview panel with VectorDB/Search stats,
 * a "Connect Elasticsearch" footer CTA with two buttons (Onboard with
 * Agent, Go to Management), and a bottom-anchored agent chat input.
 * See `NightshiftSearchHomepageBody` for the layout contract; it
 * mirrors the obs Nightshift Search page so the two surfaces stay
 * visually in sync.
 *
 * The previous Welcome / Cloud Links / Basic Metric Badges / Connect-
 * to-Elasticsearch header, the `SearchHomepageBody` content panels,
 * and the embeddable Console / Notebooks footer are all dropped for
 * the Nightshift prototype. Chrome integration (breadcrumbs, classic
 * side nav via `searchNavigation`) is preserved.
 */
export const SearchHomepagePage = () => {
  const {
    services: { history, searchNavigation },
  } = useKibana();

  useEffect(() => {
    if (searchNavigation) {
      searchNavigation.breadcrumbs.setSearchBreadCrumbs([
        {
          text: i18n.translate('xpack.searchHomepage.breadcrumbs.home', { defaultMessage: 'Home' }),
        },
      ]);
    }
  }, [searchNavigation]);

  return (
    <KibanaPageTemplate
      offset={0}
      restrictWidth={true}
      data-test-subj="search-homepage"
      grow={true}
      solutionNav={searchNavigation?.useClassicNavigation(history)}
    >
      <KibanaPageTemplate.Section
        restrictWidth={true}
        grow={true}
        paddingSize="none"
        contentProps={{
          css: { width: '100%' },
        }}
      >
        <NightshiftSearchHomepageBody />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
