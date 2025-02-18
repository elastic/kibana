/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StreamsStorageClient } from '../service';
import { GroupStream, GroupStreamChange } from './group_stream';
import { WiredStream, WiredStreamChange } from './wired_stream';

interface ApplyChangeMap {
  wired: typeof WiredStream.applyChange;
  group: typeof GroupStream.applyChange;
}

const applyChangeByType: ApplyChangeMap = {
  wired: WiredStream.applyChange,
  group: GroupStream.applyChange,
};

export type StateChange = WiredStreamChange | GroupStreamChange;

export class State {
  wiredStreams: WiredStream[];
  groupStreams: GroupStream[];

  constructor(wiredStreams: WiredStream[], groupStreams: GroupStream[]) {
    this.wiredStreams = wiredStreams;
    this.groupStreams = groupStreams;
  }

  applyChanges(requestedChanges: StateChange[]): State {
    // Optional: Expand requested changes to include automatic creation of missing streams
    const newState = this.clone();
    requestedChanges.forEach(this.makeApplyChange(newState));
    return newState;
  }

  private clone(): State {
    const wiredStreams = this.wiredStreams.map((wiredStream) => wiredStream.clone());
    const groupStreams = this.groupStreams.map((groupStream) => groupStream.clone());
    return new State(wiredStreams, groupStreams);
  }

  private makeApplyChange(newState: State) {
    return <T extends StateChange>(requestedChange: T) => {
      const applyChange = applyChangeByType[requestedChange.stream_type] as (
        requestedChange: T,
        newState: State
      ) => void;

      applyChange(requestedChange, newState);
    };
  }

  validate() {
    // Ask each stream within the state if they are in a valid state?
    return { isValid: true };
  }

  changes() {
    // Find all streams marked as changed and order them by their impact level
  }

  commitChanges() {
    // Based on .changes(), go off and do the actual work in ES
  }

  static async currentState(storageClient: StreamsStorageClient): Promise<State> {
    const wiredStreams = await WiredStream.all(storageClient);
    const groupStreams = await GroupStream.all(storageClient);
    return new State(wiredStreams, groupStreams);
  }
}
