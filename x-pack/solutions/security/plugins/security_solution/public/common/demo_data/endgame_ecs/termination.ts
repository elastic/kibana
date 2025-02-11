/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';

export const demoEndgameTerminationEvent: Ecs = {
  _id: '2MjPcG0BOpWiDweSoutC',
  user: {
    id: ['S-1-5-21-3573271228-3407584681-1597858646-1002'],
    domain: ['Anvi-Acer'],
    name: ['Arun'],
  },
  host: {
    os: {
      platform: ['windows'],
      name: ['Windows'],
      version: ['6.1'],
    },
    ip: ['10.178.85.222'],
    name: ['HD-obe-8bf77f54'],
  },
  event: {
    module: ['endgame'],
    dataset: ['esensor'],
    action: ['termination_event'],
    category: ['process'],
    kind: ['event'],
  },
  timestamp: '1569555712000',
  process: {
    hash: {
      md5: ['bd4401441a21bf1abce6404f4231db4d'],
      sha1: ['797255e72d5ed5c058d4785950eba7abaa057653'],
      sha256: ['87976f3430cc99bc939e0694247c0759961a49832b87218f4313d6fc0bc3a776'],
    },
    pid: [442384],
    ppid: [8],
    name: ['RuntimeBroker.exe'],
    executable: ['C:\\Windows\\System32\\RuntimeBroker.exe'],
  },
  endgame: {
    pid: [442384],
    process_name: ['RuntimeBroker.exe'],
    exit_code: [0],
  },
};
