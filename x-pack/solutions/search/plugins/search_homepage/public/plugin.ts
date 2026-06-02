/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { PLUGIN_ID } from '../common';

import { docLinks } from '../common/doc_links';
import { SearchHomepage } from './embeddable';
import { NIGHTSHIFT_API_KEY_TYPE } from './components/search_homepage/agent_brief/nightshift_api_key_constants';
import { NIGHTSHIFT_CREATE_API_KEY_TYPE } from './components/search_homepage/agent_brief/nightshift_create_api_key_constants';
import { initQueryClient } from './services/query_client';
import type {
  SearchHomepageAppInfo,
  SearchHomepageAppPluginStartDependencies,
  SearchHomepagePluginSetup,
  SearchHomepagePluginStart,
  SearchHomepageServicesContextDeps,
} from './types';

const appInfo: SearchHomepageAppInfo = {
  id: PLUGIN_ID,
  appRoute: '/app/elasticsearch/home',
  title: i18n.translate('xpack.searchHomepage.appTitle', { defaultMessage: 'Home' }),
};

export class SearchHomepagePlugin
  implements
    Plugin<
      SearchHomepagePluginSetup,
      SearchHomepagePluginStart,
      {},
      SearchHomepageAppPluginStartDependencies
    >
{
  private readonly kibanaVersion: string;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.kibanaVersion = this.initializerContext.env.packageInfo.version;
  }

  public setup(
    core: CoreSetup<SearchHomepageAppPluginStartDependencies, SearchHomepagePluginStart>
  ) {
    const queryClient = initQueryClient(core.notifications.toasts);
    const result: SearchHomepagePluginSetup = {
      app: appInfo,
    };

    const kibanaVersion = this.kibanaVersion;

    core.application.register({
      id: PLUGIN_ID,
      appRoute: '/app/elasticsearch/home',
      title: i18n.translate('xpack.searchHomepage.appTitle', { defaultMessage: 'Home' }),
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      euiIconType: 'logoElasticsearch',
      async mount({ element, history }: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart, depsStart] = await core.getStartServices();
        docLinks.setDocLinks(coreStart.docLinks.links);
        const startDeps: SearchHomepageServicesContextDeps = {
          ...depsStart,
          history,
        };

        return renderApp(coreStart, startDeps, element, queryClient, kibanaVersion);
      },
      order: 0,
      visibleIn: ['globalSearch', 'sideNav'],
    });

    return result;
  }

  public start(core: CoreStart, pluginsStart: SearchHomepageAppPluginStartDependencies) {
    /*
     * Register the VectorDB "Expiring API key" attachment UI
     * definition against the Agent Builder attachments service. When
     * the user pins one or more keys via the per-row paperclip on the
     * homepage, the input forwards the payloads to Agent Builder
     * through `initialAttachments`, and this registration is what
     * tells Agent Builder how to render the resulting pill + canvas.
     *
     * Lazy-loaded so the EUI-heavy attachment renderer doesn't land
     * in the homepage's main page-load bundle.
     */
    if (pluginsStart.agentBuilder) {
      const { attachments } = pluginsStart.agentBuilder;
      void import('./components/search_homepage/agent_brief/nightshift_api_key_definition').then(
        ({ createNightshiftApiKeyDefinition }) => {
          // `addAttachmentType` throws on duplicate registration; use
          // the existence probe `getAttachmentUiDefinition` since the
          // public contract doesn't expose a dedicated `has` check.
          if (!attachments.getAttachmentUiDefinition(NIGHTSHIFT_API_KEY_TYPE)) {
            attachments.addAttachmentType(
              NIGHTSHIFT_API_KEY_TYPE,
              createNightshiftApiKeyDefinition()
            );
          }
        }
      );

      /*
       * Register the "Create API key" attachment UI definition. Each
       * conversation started from the homepage input is seeded with
       * one of these as a "blank ticket" the user can open mid-chat
       * to create a key without leaving the conversation.
       *
       * Mount the dedicated flyout host into `document.body` so the
       * Open flyout action button has somewhere to portal its
       * `ApiKeyFlyout` instance from — the attachment definition
       * skips `renderInlineContent` to match the Figma single-row
       * layout, which means the action handler has no in-tree mount
       * point.
       */
      void import(
        './components/search_homepage/agent_brief/nightshift_create_api_key_definition'
      ).then(({ createNightshiftCreateApiKeyDefinition }) => {
        if (!attachments.getAttachmentUiDefinition(NIGHTSHIFT_CREATE_API_KEY_TYPE)) {
          attachments.addAttachmentType(
            NIGHTSHIFT_CREATE_API_KEY_TYPE,
            createNightshiftCreateApiKeyDefinition()
          );
        }
      });
      void import(
        './components/search_homepage/agent_brief/nightshift_create_api_key_flyout_host'
      ).then(({ mountCreateApiKeyFlyoutHost }) => {
        mountCreateApiKeyFlyoutHost(core);
      });
    }

    return {
      app: appInfo,
      SearchHomepage,
    };
  }
}
