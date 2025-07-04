/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, Plugin, CoreStart } from '@kbn/core/public';
import { QueryClient, MutationCache, QueryCache } from '@tanstack/react-query';

import { notebooksConsoleView } from './console_view';
import {
  SearchNotebooksPluginSetup,
  SearchNotebooksPluginStart,
  SearchNotebooksPluginStartDependencies,
  NotebookListValue,
  AppMetricsTracker,
} from './types';
import { getErrorCode, getErrorMessage, isKibanaServerError } from './utils/get_error_message';
import { createUsageTracker } from './utils/usage_tracker';
import { removeNotebookParameter, setNotebookParameter } from './utils/notebook_query_param';

export class SearchNotebooksPlugin
  implements Plugin<SearchNotebooksPluginSetup, SearchNotebooksPluginStart>
{
  private notebooksList: NotebookListValue = null;
  private queryClient: QueryClient | undefined;
  private usageTracker: AppMetricsTracker | undefined;

  public setup(core: CoreSetup): SearchNotebooksPluginSetup {
    this.queryClient = new QueryClient({
      mutationCache: new MutationCache({
        onError: (error) => {
          core.notifications.toasts.addError(error as Error, {
            title: (error as Error).name,
            toastMessage: getErrorMessage(error),
            toastLifeTimeMs: 1000,
          });
        },
      }),
      queryCache: new QueryCache({
        onError: (error) => {
          // 404s are often functionally okay and shouldn't show toasts by default
          if (getErrorCode(error) === 404) {
            return;
          }
          if (isKibanaServerError(error) && !error.skipToast) {
            core.notifications.toasts.addError(error, {
              title: error.name,
              toastMessage: getErrorMessage(error),
              toastLifeTimeMs: 1000,
            });
          }
        },
      }),
    });
    return {};
  }
  public start(
    core: CoreStart,
    deps: SearchNotebooksPluginStartDependencies
  ): SearchNotebooksPluginStart {
    this.usageTracker = createUsageTracker(deps.usageCollection);
    if (deps.console?.registerEmbeddedConsoleAlternateView) {
      deps.console.registerEmbeddedConsoleAlternateView(
        notebooksConsoleView(
          core,
          this.queryClient!,
          this.usageTracker,
          this.clearNotebooksState.bind(this),
          this.getNotebookList.bind(this)
        )
      );
    }
    return {
      setNotebookList: (value: NotebookListValue) => {
        this.setNotebookList(value);
      },
      setSelectedNotebook: (value: string) => {
        setNotebookParameter(value);
      },
    };
  }
  public stop() {}

  private clearNotebooksState() {
    this.setNotebookList(null);
    removeNotebookParameter();
  }

  private setNotebookList(value: NotebookListValue) {
    this.notebooksList = value;
  }

  private getNotebookList(): NotebookListValue {
    return this.notebooksList;
  }
}
