/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { toNumberRt } from '@kbn/io-ts-utils';
import {
  StackTracesDisplayOption,
  TopNComparisonFunctionSortField,
  topNComparisonFunctionSortFieldRt,
  TopNFunctionSortField,
  topNFunctionSortFieldRt,
  TopNType,
} from '@kbn/profiling-utils';
import { createRouter, Outlet } from '@kbn/typed-react-router-config';
import * as t from 'io-ts';
import React from 'react';
import {
  indexLifecyclePhaseRt,
  IndexLifecyclePhaseSelectOption,
} from '../../common/storage_explorer';
import { ComparisonMode, NormalizationMode } from '../components/normalization_menu';
import { RedirectTo } from '../components/redirect_to';
import { AddDataTabs, AddDataView } from '../views/add_data_view';
import { DeleteDataView } from '../views/delete_data_view';
import { FlameGraphsView } from '../views/flamegraphs';
import { DifferentialFlameGraphsView } from '../views/flamegraphs/differential_flamegraphs';
import { FlameGraphView } from '../views/flamegraphs/flamegraph';
import { FunctionsView } from '../views/functions';
import { DifferentialTopNFunctionsView } from '../views/functions/differential_topn';
import { TopNFunctionsView } from '../views/functions/topn';
import { Settings } from '../views/settings';
import { StackTracesView } from '../views/stack_traces_view';
import { StorageExplorerView } from '../views/storage_explorer';
import { RouteBreadcrumb } from './route_breadcrumb';

const routes = {
  '/': {
    element: (
      <RouteBreadcrumb
        title={i18n.translate('xpack.profiling.breadcrumb.profiling', {
          defaultMessage: 'Universal Profiling',
        })}
        href="/"
      >
        <Outlet />
      </RouteBreadcrumb>
    ),
    children: {
      '/settings': {
        element: (
          <RouteBreadcrumb
            title={i18n.translate('xpack.profiling.breadcrumb.settings', {
              defaultMessage: 'Settings',
            })}
            href="/settings"
          >
            <Settings />
          </RouteBreadcrumb>
        ),
      },
      '/add-data-instructions': {
        element: (
          <RouteBreadcrumb
            title={i18n.translate('xpack.profiling.breadcrumb.addDataView', {
              defaultMessage: 'Add profiling data',
            })}
            href="/add-data-instructions"
          >
            <AddDataView />
          </RouteBreadcrumb>
        ),
        params: t.type({
          query: t.type({
            selectedTab: t.union([
              t.literal(AddDataTabs.Binary),
              t.literal(AddDataTabs.Deb),
              t.literal(AddDataTabs.Docker),
              t.literal(AddDataTabs.ElasticAgentIntegration),
              t.literal(AddDataTabs.Kubernetes),
              t.literal(AddDataTabs.RPM),
              t.literal(AddDataTabs.Symbols),
            ]),
          }),
        }),
        defaults: {
          query: {
            selectedTab: AddDataTabs.Kubernetes,
          },
        },
      },
      '/delete_data_instructions': {
        element: <DeleteDataView />,
      },
      '/': {
        children: {
          '/stacktraces/{topNType}': {
            element: <StackTracesView />,
            params: t.type({
              path: t.type({
                topNType: t.union([
                  t.literal(TopNType.Containers),
                  t.literal(TopNType.Deployments),
                  t.literal(TopNType.Hosts),
                  t.literal(TopNType.Threads),
                  t.literal(TopNType.Traces),
                ]),
              }),
              query: t.type({
                displayAs: t.union([
                  t.literal(StackTracesDisplayOption.StackTraces),
                  t.literal(StackTracesDisplayOption.Percentage),
                ]),
                limit: toNumberRt,
              }),
            }),
            defaults: {
              query: {
                displayAs: StackTracesDisplayOption.StackTraces,
                limit: '10',
              },
            },
          },
          '/stacktraces': {
            element: <RedirectTo pathname="/stacktraces/threads" />,
          },
          '/flamegraphs': {
            element: (
              <RouteBreadcrumb
                title={i18n.translate('xpack.profiling.breadcrumb.flamegraphs', {
                  defaultMessage: 'Flamegraphs',
                })}
                href="/flamegraphs/flamegraph"
              >
                <FlameGraphsView>
                  <Outlet />
                </FlameGraphsView>
              </RouteBreadcrumb>
            ),
            children: {
              '/flamegraphs/flamegraph': {
                element: (
                  <RouteBreadcrumb
                    title={i18n.translate('xpack.profiling.breadcrumb.flamegraph', {
                      defaultMessage: 'Flamegraph',
                    })}
                    href="/flamegraphs/flamegraph"
                  >
                    <FlameGraphView />
                  </RouteBreadcrumb>
                ),
                params: t.type({
                  query: t.partial({
                    searchText: t.string,
                  }),
                }),
              },
              '/flamegraphs/differential': {
                element: (
                  <RouteBreadcrumb
                    title={i18n.translate('xpack.profiling.breadcrumb.differentialFlamegraph', {
                      defaultMessage: 'Differential flamegraph',
                    })}
                    href="/flamegraphs/differential"
                  >
                    <DifferentialFlameGraphsView />
                  </RouteBreadcrumb>
                ),
                params: t.type({
                  query: t.intersection([
                    t.type({
                      comparisonRangeFrom: t.string,
                      comparisonRangeTo: t.string,
                      comparisonKuery: t.string,
                      comparisonMode: t.union([
                        t.literal(ComparisonMode.Absolute),
                        t.literal(ComparisonMode.Relative),
                      ]),
                      normalizationMode: t.union([
                        t.literal(NormalizationMode.Scale),
                        t.literal(NormalizationMode.Time),
                      ]),
                    }),
                    t.partial({
                      baseline: toNumberRt,
                      comparison: toNumberRt,
                      searchText: t.string,
                    }),
                  ]),
                }),
                defaults: {
                  query: {
                    comparisonRangeFrom: 'now-15m',
                    comparisonRangeTo: 'now',
                    comparisonKuery: '',
                    comparisonMode: ComparisonMode.Absolute,
                    normalizationMode: NormalizationMode.Time,
                  },
                },
              },
            },
          },
          '/functions': {
            element: (
              <RouteBreadcrumb
                title={i18n.translate('xpack.profiling.breadcrumb.functions', {
                  defaultMessage: 'Functions',
                })}
                href="/functions/topn"
              >
                <FunctionsView>
                  <Outlet />
                </FunctionsView>
              </RouteBreadcrumb>
            ),
            params: t.type({
              query: t.type({
                sortField: topNFunctionSortFieldRt,
                sortDirection: t.union([t.literal('asc'), t.literal('desc')]),
              }),
            }),
            defaults: {
              query: {
                sortField: TopNFunctionSortField.Rank,
                sortDirection: 'asc',
              },
            },
            children: {
              '/functions/topn': {
                element: (
                  <RouteBreadcrumb
                    title={i18n.translate('xpack.profiling.breadcrumb.topnFunctions', {
                      defaultMessage: 'Top N',
                    })}
                    href="/functions/topn"
                  >
                    <TopNFunctionsView />
                  </RouteBreadcrumb>
                ),
                params: t.type({
                  query: t.partial({ pageIndex: toNumberRt }),
                }),
              },
              '/functions/differential': {
                element: (
                  <RouteBreadcrumb
                    title={i18n.translate('xpack.profiling.breadcrumb.differentialFunctions', {
                      defaultMessage: 'Differential Top N',
                    })}
                    href="/functions/differential"
                  >
                    <DifferentialTopNFunctionsView />
                  </RouteBreadcrumb>
                ),
                params: t.type({
                  query: t.intersection([
                    t.type({
                      comparisonRangeFrom: t.string,
                      comparisonRangeTo: t.string,
                      comparisonKuery: t.string,
                      normalizationMode: t.union([
                        t.literal(NormalizationMode.Scale),
                        t.literal(NormalizationMode.Time),
                      ]),
                      comparisonSortField: topNComparisonFunctionSortFieldRt,
                      comparisonSortDirection: t.union([t.literal('asc'), t.literal('desc')]),
                    }),
                    t.partial({
                      baseline: toNumberRt,
                      comparison: toNumberRt,
                      pageIndex: toNumberRt,
                    }),
                  ]),
                }),
                defaults: {
                  query: {
                    comparisonRangeFrom: 'now-15m',
                    comparisonRangeTo: 'now',
                    comparisonKuery: '',
                    normalizationMode: NormalizationMode.Time,
                    comparisonSortField: TopNComparisonFunctionSortField.ComparisonRank,
                    comparisonSortDirection: 'asc',
                  },
                },
              },
            },
          },
          '/storage-explorer': {
            element: (
              <RouteBreadcrumb
                title={i18n.translate('xpack.profiling.breadcrumb.storageExplorer', {
                  defaultMessage: 'Storage explorer',
                })}
                href="/storage-explorer"
              >
                <StorageExplorerView />
              </RouteBreadcrumb>
            ),
            params: t.type({
              query: indexLifecyclePhaseRt,
            }),
            defaults: {
              query: {
                indexLifecyclePhase: IndexLifecyclePhaseSelectOption.All,
              },
            },
          },
          '/': {
            element: <RedirectTo pathname="/stacktraces/threads" />,
          },
        },
        element: <Outlet />,
        params: t.type({
          query: t.type({
            rangeFrom: t.string,
            rangeTo: t.string,
            kuery: t.string,
          }),
        }),
        defaults: {
          query: {
            kuery: '',
          },
        },
      },
    },
  },
};

export const profilingRouter = createRouter(routes);
export type ProfilingRoutes = typeof routes;
export type ProfilingRouter = typeof profilingRouter;
