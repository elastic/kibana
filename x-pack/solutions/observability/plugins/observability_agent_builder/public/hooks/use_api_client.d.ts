import { type DefaultClientOptions } from '@kbn/server-route-repository-client';
import type { RouteRepositoryClient } from '@kbn/server-route-repository-utils';
import type { ObservabilityAgentBuilderServerRouteRepository } from '../../server';
export declare function useApiClient(): RouteRepositoryClient<ObservabilityAgentBuilderServerRouteRepository, DefaultClientOptions>;
