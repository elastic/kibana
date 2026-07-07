/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, PluginInitializerContext } from '@kbn/core/public';
import { type CoreSetup, type Plugin } from '@kbn/core/public';
import { createAppService } from '@kbn/ai-assistant';
import ReactDOM from 'react-dom';
import React from 'react';
import type {
  SearchAssistantPluginSetup,
  SearchAssistantPluginStart,
  SearchAssistantPluginStartDependencies,
} from './types';
import { NavControlInitiator } from './components/nav_control/lazy_nav_control';

export interface PublicConfigType {
  ui: {
    enabled: boolean;
  };
}

export class SearchAssistantPlugin
  implements
    Plugin<
      SearchAssistantPluginSetup,
      SearchAssistantPluginStart,
      {},
      SearchAssistantPluginStartDependencies
    >
{
  private readonly config: PublicConfigType;

  constructor(private readonly context: PluginInitializerContext) {
    this.config = this.context.config.get();
  }

  public setup(
    core: CoreSetup<SearchAssistantPluginStartDependencies, SearchAssistantPluginStart>
  ): SearchAssistantPluginSetup {
    return {};
  }

  public start(
    coreStart: CoreStart,
    pluginsStart: SearchAssistantPluginStartDependencies
  ): SearchAssistantPluginStart {
    if (!this.config.ui.enabled) {
      return {};
    }
    const appService = createAppService({
      pluginsStart,
    });
    const isEnabled = appService.isEnabled();
    const aiAssistantIsEnabled = coreStart.application.capabilities.observabilityAIAssistant?.show;

    if (!isEnabled || !aiAssistantIsEnabled) {
      return {};
    }

    const mountSearchAssistant = (element: HTMLElement) => {
      ReactDOM.render(
        <NavControlInitiator
          appService={appService}
          coreStart={coreStart}
          pluginsStart={pluginsStart}
        />,
        element,
        () => {}
      );

      return () => {
        ReactDOM.unmountComponentAtNode(element);
      };
    };

    coreStart.chrome.navControls.registerRight({
      mount: mountSearchAssistant,
      // right before the user profile
      order: 1001,
    });

    // Chrome Next transition: also expose this control as an AI button so it renders in the
    // Chrome Next global header (behind the `core.chrome.next` feature flag). Chrome Next does
    // not render HeaderNavControls (`registerRight` mount points), so we dual-register for now.
    // Remove the `registerRight` registration once Chrome Next is the only chrome.
    // See https://github.com/elastic/kibana/issues/260010
    coreStart.chrome.next.aiButton.register({
      content: mountSearchAssistant,
    });

    return {};
  }

  public stop() {}
}
