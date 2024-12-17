/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import { escapeRegExp } from 'lodash';
import { sortProcesses } from '../../../common/utils/sort_processes';
import type {
  AlertStatusEventEntityIdMap,
  Process,
  ProcessEvent,
  ProcessMap,
  ProcessFields,
} from '../../../common';
import { ProcessImpl } from './hooks';

// Creates an instance of Process, from a nested leader process fieldset
// This is used to ensure we always have a record for a session leader, as well as
// a parent record for potentially orphaned processes
export function inferProcessFromLeaderInfo(sourceEvent?: ProcessEvent, leader?: ProcessFields) {
  const entityId = leader?.entity_id || uuidv4();
  const process = new ProcessImpl(entityId);

  if (sourceEvent && leader) {
    const event = {
      ...sourceEvent,
      process: {
        ...sourceEvent.process,
        ...leader,
      },
      user: leader.user,
      group: leader.group,
      event: {
        ...sourceEvent.event,
        id: `fake-${entityId}`,
      },
    };

    // won't be accurate, so removing
    if (sourceEvent.process?.parent === leader) {
      delete event.process?.parent;
    }

    process.addEvent(event);
  }

  return process;
}

// if given event is an alert, and it exist in updatedAlertsStatus, update the alert's status
// with the updated status value in updatedAlertsStatus Map
export const updateAlertEventStatus = (
  events: ProcessEvent[],
  updatedAlertsStatus: AlertStatusEventEntityIdMap
) =>
  events.map((event) => {
    // do nothing if event is not an alert
    if (!event.kibana) {
      return event;
    }

    return {
      ...event,
      kibana: {
        ...event.kibana,
        alert: {
          ...event.kibana.alert,
          workflow_status:
            updatedAlertsStatus[event.kibana.alert?.uuid ?? '']?.status ??
            event.kibana.alert?.workflow_status,
        },
      },
    };
  });

// given a page of new events, add these events to the appropriate process class model
// create a new process if none are created and return the mutated processMap
export const updateProcessMap = (processMap: ProcessMap, events: ProcessEvent[]) => {
  events.forEach((event) => {
    const { entity_id: id } = event.process ?? {};
    if (!id) {
      return;
    }

    let process = processMap[id];

    if (!process) {
      process = new ProcessImpl(id);
      processMap[id] = process;
    }

    if (event.kibana?.alert) {
      process.addAlert(event);
    } else if (event.event?.kind === 'event') {
      process.addEvent(event);
    }
  });

  return processMap;
};

// given a page of events, update process model parent child relationships
// if we cannot find a parent for a process include said process
// in the array of orphans. We track orphans in their own array, so
// we can attempt to re-parent the orphans when new pages of events are
// processed. This is especially important when paginating backwards
// (e.g in the case where the SessionView jumpToEvent prop is used, potentially skipping over ancestor processes)
export const buildProcessTree = (
  processMap: ProcessMap,
  events: ProcessEvent[],
  orphans: Process[],
  sessionEntityId: string,
  backwardDirection: boolean = false
) => {
  // we process events in reverse order when paginating backwards.
  if (backwardDirection) {
    events = events.slice().reverse();
  }

  events.forEach((event) => {
    const { entity_id: id, parent } = event.process ?? {};
    const process = processMap[id ?? ''];
    let parentProcess = processMap[parent?.entity_id ?? ''];

    // if either entity_id or parent does not exist, return
    // if process already has a parent, return
    if (!id || !parent || process.parent || id === sessionEntityId) {
      return;
    }

    if (!parentProcess) {
      // infer a fake process for the parent, incase we don't end up loading any parent events (due to filtering or jumpToCursor pagination)
      const parentFields = event?.process?.parent;

      if (parentFields?.entity_id && !processMap[parentFields.entity_id]) {
        parentProcess = inferProcessFromLeaderInfo(event, parentFields);
        processMap[parentProcess.id] = parentProcess;

        if (!orphans.includes(parentProcess)) {
          orphans.push(parentProcess);
        }
      } else {
        if (!orphans.includes(process)) {
          orphans.push(process);
        }
      }
    }

    if (parentProcess) {
      process.parent = parentProcess; // handy for recursive operations (like auto expand)
      parentProcess.addChild(process);
    }
  });

  const newOrphans: Process[] = [];

  // with this new page of events processed, lets try re-parent any orphans
  orphans?.forEach((process) => {
    const parentProcessId = process.getDetails().process?.parent?.entity_id;

    if (parentProcessId) {
      const parentProcess = processMap[parentProcessId];

      if (parentProcess) {
        process.parent = parentProcess;
        parentProcess.addChild(process);

        return;
      }
    }

    newOrphans.push(process);
  });

  return newOrphans;
};

// given a plain text searchQuery, iterates over all processes in processMap
// and marks ones which match the below text (currently what is rendered in the process line item)
// process.searchMatched is used by process_tree_node to highlight the text which matched the search
// this funtion also returns a list of process results which is used by session_view_search_bar to drive
// result navigation UX
// FYI: this function mutates properties of models contained in processMap
export const searchProcessTree = (
  processMap: ProcessMap,
  searchQuery: string | undefined,
  verboseMode: boolean
) => {
  const results = [];

  for (const processId of Object.keys(processMap)) {
    const process = processMap[processId];

    if (searchQuery) {
      const details = process.getDetails();
      const entryLeader = details?.process?.entry_leader;

      // if this is the entry leader process OR verbose mode is OFF and is a verbose process, don't match.
      if (entryLeader?.entity_id === process.id || (!verboseMode && process.isVerbose())) {
        continue;
      }

      const event = process.getDetails();
      const { working_directory: workingDirectory, args } = event.process ?? {};

      // TODO: the text we search is the same as what we render.
      // in future we may support KQL searches to match against any property
      // for now plain text search is limited to searching process.working_directory + process.args
      const text = `${workingDirectory ?? ''} ${args?.join(' ')}`;

      const searchMatch = [...text.matchAll(new RegExp(escapeRegExp(searchQuery), 'gi'))];

      process.searchMatched =
        searchMatch.length > 0 ? getSearchMatchedIndices(text, searchMatch) : null;

      if (process.searchMatched) {
        results.push(process);
      }
    } else {
      process.clearSearch();
    }
  }

  return results.sort(sortProcesses);
};

const getSearchMatchedIndices = (text: string, matches: RegExpMatchArray[]) => {
  return text.split('').reduce((accum, _, idx) => {
    const findMatch = matches.find(
      (match) =>
        match.index !== undefined && idx >= match.index && idx < match.index + match[0].length
    );

    if (findMatch) {
      accum = [...accum, idx];
    }

    return accum;
  }, [] as number[]);
};

// Iterate over all processes in processMap, and mark each process (and it's ancestors) for auto expansion if:
// a) the process was "user entered" (aka an interactive group leader)
// b) we are jumping to a specific process
// Returns the processMap with it's processes autoExpand bool set to true or false
// process.autoExpand is read by process_tree_node to determine whether to auto expand it's child processes.
export const autoExpandProcessTree = (processMap: ProcessMap, jumpToEntityId?: string) => {
  for (const processId of Object.keys(processMap)) {
    const process = processMap[processId];

    if (process.isUserEntered() || jumpToEntityId === process.id || process.hasAlerts()) {
      let { parent } = process;
      const parentIdSet = new Set<string>();

      while (parent && !parentIdSet.has(parent.id)) {
        parentIdSet.add(parent.id);
        parent.autoExpand = true;
        parent = parent.parent;
      }
    }
  }

  return processMap;
};

// recusively collapses all children below provided node
export const collapseProcessTree = (node: Process) => {
  if (!node.autoExpand) {
    return;
  }

  if (node.children) {
    node.children.forEach((child) => {
      child.autoExpand = false;
      collapseProcessTree(child);
    });
  }
};

export const processNewEvents = (
  eventsProcessMap: ProcessMap,
  events: ProcessEvent[] | undefined,
  orphans: Process[],
  sessionEntityId: string,
  backwardDirection: boolean = false
): [ProcessMap, Process[]] => {
  if (!events || events.length === 0) {
    return [eventsProcessMap, orphans];
  }

  const updatedProcessMap = updateProcessMap(eventsProcessMap, events);
  const newOrphans = buildProcessTree(
    updatedProcessMap,
    events,
    orphans,
    sessionEntityId,
    backwardDirection
  );

  return [autoExpandProcessTree(updatedProcessMap), newOrphans];
};
