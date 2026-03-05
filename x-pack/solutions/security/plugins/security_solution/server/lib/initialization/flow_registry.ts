/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type {
  InitializationFlowId,
  InitializationFlowResult,
} from '../../../common/api/initialization';
import type { InitializationFlowContext, InitializationFlowDefinition } from './types';

type FlowResults = Record<string, InitializationFlowResult>;

export class InitializationFlowRegistry {
  private readonly flows = new Map<InitializationFlowId, InitializationFlowDefinition>();

  constructor(private readonly logger: Logger) {}

  register(definition: InitializationFlowDefinition): void {
    if (this.flows.has(definition.id)) {
      throw new Error(`Initialization flow '${definition.id}' is already registered`);
    }
    if (definition.dependencies?.includes(definition.id)) {
      throw new Error(
        `Failed to register initialization flow '${definition.id}': flow cannot depend on itself`
      );
    }
    this.flows.set(definition.id, definition);
    this.detectCycle(definition.id);
    this.logger.debug(`Registered initialization flow: ${definition.id}`);
  }

  getFlow(id: InitializationFlowId): InitializationFlowDefinition | undefined {
    return this.flows.get(id);
  }

  getRegisteredFlowIds(): InitializationFlowId[] {
    return [...this.flows.keys()];
  }

  /**
   * Returns the requested flows plus all their transitive dependencies.
   */
  resolveWithDependencies(requestedFlows: InitializationFlowId[]): InitializationFlowId[] {
    return this.collectWithDependencies(requestedFlows);
  }

  /**
   * Runs the requested initialization flows respecting dependency order.
   * Independent flows within the same dependency level run in parallel.
   */
  async run(
    requestedFlows: InitializationFlowId[],
    context: InitializationFlowContext
  ): Promise<FlowResults> {
    const results: FlowResults = {};

    const registeredFlows = requestedFlows.filter((flowId) => {
      if (this.flows.has(flowId)) return true;
      results[flowId] = {
        status: 'error',
        error: `Initialization flow '${flowId}' is not registered`,
      };
      return false;
    });

    const levels = this.resolveDependencyLevels(registeredFlows);

    for (const level of levels) {
      const promises = level.map(async (flowId) => {
        const definition = this.flows.get(flowId)!;

        if (this.hasDependencyFailure(definition, results)) {
          results[flowId] = {
            status: 'error',
            error: `Skipped due to failed dependency`,
          };
          return;
        }

        try {
          results[flowId] = await definition.provision(context);
        } catch (err) {
          this.logger.error(`Initialization flow '${flowId}' failed: ${err.message}`);
          results[flowId] = {
            status: 'error',
            error: err.message,
          };
        }
      });

      await Promise.all(promises);
    }

    return results;
  }

  private hasDependencyFailure(
    definition: InitializationFlowDefinition,
    results: FlowResults
  ): boolean {
    return (definition.dependencies ?? []).some((depId) => results[depId]?.status === 'error');
  }

  /**
   * Walks the dependency graph starting from the given flow and throws if a
   * cycle is detected. Called at registration time so the error surfaces
   * immediately in the Kibana logs during plugin startup.
   */
  private detectCycle(startId: InitializationFlowId): void {
    const visiting = new Set<InitializationFlowId>();

    const visit = (id: InitializationFlowId, path: InitializationFlowId[]): void => {
      if (visiting.has(id)) {
        const cycle = [...path.slice(path.indexOf(id)), id].join(' → ');
        throw new Error(
          `Failed to register initialization flow '${startId}': ` +
            `circular dependency detected: ${cycle}`
        );
      }

      const definition = this.flows.get(id);
      if (!definition?.dependencies) return;

      visiting.add(id);
      for (const dep of definition.dependencies) {
        visit(dep, [...path, id]);
      }
      visiting.delete(id);
    };

    visit(startId, []);
  }

  /**
   * Groups flows into dependency levels for parallel execution.
   * Level 0 has no dependencies, level 1 depends only on level 0, etc.
   * Automatically includes transitive dependencies of requested flows.
   */
  private resolveDependencyLevels(
    requestedFlows: InitializationFlowId[]
  ): InitializationFlowId[][] {
    const allFlows = this.collectWithDependencies(requestedFlows);

    const depthMap = new Map<InitializationFlowId, number>();

    const getDepth = (id: InitializationFlowId): number => {
      if (depthMap.has(id)) return depthMap.get(id)!;

      const definition = this.flows.get(id);
      const deps = definition?.dependencies ?? [];

      const depth = deps.length === 0 ? 0 : Math.max(...deps.map(getDepth)) + 1;

      depthMap.set(id, depth);
      return depth;
    };

    for (const id of allFlows) {
      getDepth(id);
    }

    const maxDepth = allFlows.length > 0 ? Math.max(...allFlows.map(getDepth)) : -1;

    const levels: InitializationFlowId[][] = [];
    for (let depth = 0; depth <= maxDepth; depth++) {
      levels.push(allFlows.filter((id) => getDepth(id) === depth));
    }

    return levels;
  }

  /**
   * Collects the requested flows plus all their transitive dependencies.
   */
  private collectWithDependencies(requestedFlows: InitializationFlowId[]): InitializationFlowId[] {
    const collected = new Set<InitializationFlowId>();

    const visit = (id: InitializationFlowId) => {
      if (collected.has(id)) return;
      collected.add(id);

      const definition = this.flows.get(id);
      if (definition?.dependencies) {
        for (const dep of definition.dependencies) {
          visit(dep);
        }
      }
    };

    for (const id of requestedFlows) {
      visit(id);
    }

    return [...collected];
  }
}

export const createInitializationFlowRegistry = (logger: Logger): InitializationFlowRegistry => {
  return new InitializationFlowRegistry(logger);
};
