/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useParams } from 'react-router-dom';
import React, { useMemo } from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderMenu } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { PLUGIN_TITLE } from '../../../common';
import { PLUGIN_ROUTE_ROOT } from '../../../common/api_routes';
import { useKibana } from '../../hooks/use_kibana';
import { useSynonymsBreadcrumbs } from '../../hooks/use_synonyms_breadcrumbs';
import { SynonymsSetRuleTable } from './synonyms_set_rule_table';
import { ConnectToApiFlyout } from '../connect_to_api/connect_to_api_flyout';

export const SynonymsSetDetail = () => {
  const { synonymsSetId = '' } = useParams<{
    synonymsSetId?: string;
  }>();
  const {
    services: { console: consolePlugin, history, searchNavigation, http },
  } = useKibana();
  useSynonymsBreadcrumbs(synonymsSetId);

  const embeddableConsole = useMemo(
    () => (consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null),
    [consolePlugin]
  );
  const [isApiConnectModalVisible, setIsApiConnectModalVisible] = React.useState(false);

  const menu = useMemo<AppHeaderMenu>(
    () => ({
      items: [
        {
          id: 'assignToIndex',
          label: i18n.translate('xpack.searchSynonyms.synonymsSetDetail.assignToIndexButton', {
            defaultMessage: 'Assign to index',
          }),
          iconType: 'endpoint',
          testId: 'searchSynonymsSynonymsSetDetailConnectToApiButton',
          run: () => {
            setIsApiConnectModalVisible(true);
          },
        },
      ],
    }),
    []
  );

  return (
    <KibanaPageTemplate
      offset={0}
      restrictWidth={false}
      grow={false}
      data-test-subj="searchSynonymsSetDetailPage"
      solutionNav={searchNavigation?.useClassicNavigation(history)}
    >
      <AppHeader
        title={synonymsSetId}
        back={{
          href: http.basePath.prepend(PLUGIN_ROUTE_ROOT),
          label: PLUGIN_TITLE,
        }}
        menu={menu}
      />
      <KibanaPageTemplate.Section restrictWidth>
        {synonymsSetId && <SynonymsSetRuleTable synonymsSetId={synonymsSetId} />}
        {isApiConnectModalVisible && (
          <ConnectToApiFlyout
            rulesetId={synonymsSetId}
            onClose={() => {
              setIsApiConnectModalVisible(false);
            }}
          />
        )}
      </KibanaPageTemplate.Section>
      {embeddableConsole}
    </KibanaPageTemplate>
  );
};
