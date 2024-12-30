/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeepPartial } from 'utility-types';
import { merge } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { AGENT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX } from '@kbn/fleet-plugin/common';
import { BaseDataGenerator } from './base_data_generator';
import type {
  ActivityLogAction,
  ActivityLogActionResponse,
  EndpointAction,
  EndpointActionResponse,
} from '../types';
import { ActivityLogItemTypes } from '../types';
import { RESPONSE_ACTION_API_COMMANDS_NAMES } from '../service/response_actions/constants';

export class FleetActionGenerator extends BaseDataGenerator {
  /** Generate a random endpoint Action (isolate or unisolate) */
  generate(overrides: DeepPartial<EndpointAction> = {}): EndpointAction {
    const timeStamp = overrides['@timestamp'] ? new Date(overrides['@timestamp']) : new Date();
    return merge(
      {
        action_id: this.seededUUIDv4(),
        '@timestamp': timeStamp.toISOString(),
        expiration: this.randomFutureDate(timeStamp),
        type: 'INPUT_ACTION',
        input_type: 'endpoint',
        agents: overrides.agents ? overrides.agents : [this.seededUUIDv4()],
        user_id: 'elastic',
        data: {
          command: this.randomResponseActionCommand(),
          comment: this.randomString(15),
          parameter: undefined,
          output: undefined,
        },
      },
      overrides as EndpointAction
    );
  }

  generateActionEsHit(
    overrides: DeepPartial<EndpointAction> = {}
  ): estypes.SearchHit<EndpointAction> {
    return Object.assign(this.toEsSearchHit(this.generate(overrides)), {
      _index: AGENT_ACTIONS_INDEX,
    });
  }

  generateIsolateAction(overrides: DeepPartial<EndpointAction> = {}): EndpointAction {
    return merge(this.generate({ data: { command: 'isolate' } }), overrides);
  }

  generateUnIsolateAction(overrides: DeepPartial<EndpointAction> = {}): EndpointAction {
    return merge(this.generate({ data: { command: 'unisolate' } }), overrides);
  }

  /** Generates an endpoint Fleet action response */
  generateResponse(overrides: DeepPartial<EndpointActionResponse> = {}): EndpointActionResponse {
    const timeStamp = overrides['@timestamp'] ? new Date(overrides['@timestamp']) : new Date();

    const startedAtTimes: number[] = [];
    [2, 3, 5, 8, 13, 21].forEach((n) => {
      startedAtTimes.push(
        timeStamp.setMinutes(-this.randomN(n)),
        timeStamp.setSeconds(-this.randomN(n))
      );
    });

    return merge(
      {
        action_data: {
          command: this.randomResponseActionCommand(),
          comment: '',
          parameter: undefined,
        },
        action_id: this.seededUUIDv4(),
        agent_id: this.seededUUIDv4(),
        started_at: new Date(startedAtTimes[this.randomN(startedAtTimes.length)]).toISOString(),
        completed_at: timeStamp.toISOString(),
        error: undefined,
        '@timestamp': timeStamp.toISOString(),
      },
      overrides
    );
  }

  generateResponseEsHit(
    overrides: DeepPartial<EndpointActionResponse> = {}
  ): estypes.SearchHit<EndpointActionResponse> {
    return Object.assign(this.toEsSearchHit(this.generateResponse(overrides)), {
      _index: AGENT_ACTIONS_RESULTS_INDEX,
    });
  }

  /**
   * An Activity Log entry as returned by the Activity log API
   * @param overrides
   */
  generateActivityLogAction(overrides: DeepPartial<ActivityLogAction> = {}): ActivityLogAction {
    return merge(
      {
        type: ActivityLogItemTypes.FLEET_ACTION,
        item: {
          id: this.seededUUIDv4(),
          data: this.generate(),
        },
      },
      overrides
    );
  }

  /**
   * An Activity Log entry as returned by the Activity log API
   * @param overrides
   */
  generateActivityLogActionResponse(
    overrides: DeepPartial<ActivityLogActionResponse> = {}
  ): ActivityLogActionResponse {
    return merge(
      {
        type: ActivityLogItemTypes.FLEET_RESPONSE,
        item: {
          id: this.seededUUIDv4(),
          data: this.generateResponse(),
        },
      },
      overrides
    );
  }

  randomFloat(): number {
    return this.random();
  }

  randomN(max: number): number {
    return super.randomN(max);
  }

  protected randomResponseActionCommand() {
    return this.randomChoice(RESPONSE_ACTION_API_COMMANDS_NAMES);
  }
}
