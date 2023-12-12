/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALL_HOSTS_TAB,
  EVENTS_TAB,
  SESSIONS_TAB,
  UNCOMMON_PROCESSES_TAB,
} from '../../screens/hosts/main';
import { waitForTabToBeLoaded } from '../common';

export const openAllHosts = () => waitForTabToBeLoaded(ALL_HOSTS_TAB);

export const openEvents = () => waitForTabToBeLoaded(EVENTS_TAB);

export const openUncommonProcesses = () => waitForTabToBeLoaded(UNCOMMON_PROCESSES_TAB);

export const openSessions = () => waitForTabToBeLoaded(SESSIONS_TAB);
