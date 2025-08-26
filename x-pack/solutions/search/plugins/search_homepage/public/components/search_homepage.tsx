/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { EuiHorizontalRule, EuiLoadingSpinner } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { useKibana } from '../hooks/use_kibana';
import { useIngestionCtaFeatureFlag } from '../hooks/use_ingestion_cta_feature_flag';
import { useSearchHomePageRedirect } from '../hooks/use_search_home_page_redirect';
import { SearchHomepageBody } from './search_homepage_body';
import { SearchHomepageHeader } from './search_homepage_header';
import { SearchHomepageIngestionVariantBody } from './ingestion_body';

export const SearchHomepagePage = () => {
  const {
    services: { console: consolePlugin, history, searchNavigation },
  } = useKibana();
  useEffect(() => {
    if (searchNavigation) {
      searchNavigation.breadcrumbs.setSearchBreadCrumbs([]);
    }
  }, [searchNavigation]);
  const ingestionCTAVariantLoaded = useIngestionCtaFeatureFlag();
  const { isLoading } = useSearchHomePageRedirect();

  const embeddableConsole = useMemo(
    () => (consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null),
    [consolePlugin]
  );

  return (
    <KibanaPageTemplate
      offset={0}
      restrictWidth={false}
      data-test-subj="search-homepage"
      grow={false}
      solutionNav={searchNavigation?.useClassicNavigation(history)}
    >
      {isLoading ? (
        <KibanaPageTemplate.EmptyPrompt icon={<EuiLoadingSpinner size="xl" />} />
      ) : (
        <>
          <SearchHomepageHeader />
          <EuiHorizontalRule margin="none" />
          {ingestionCTAVariantLoaded ? (
            <SearchHomepageIngestionVariantBody />
          ) : (
            <SearchHomepageBody />
          )}
          {embeddableConsole}
        </>
      )}
    </KibanaPageTemplate>
  );
};
