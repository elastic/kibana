/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { dnsStrategy, buildDnsNarrative } from './dns_strategy';
export { cloudStrategy, buildCloudNarrative } from './cloud_strategy';
export { threatMatchStrategy, buildThreatMatchNarrative } from './threat_match_strategy';
export {
  machineLearningStrategy,
  buildMachineLearningNarrative,
} from './machine_learning_strategy';
export { authenticationStrategy, buildAuthenticationNarrative } from './authentication_strategy';
export { registryStrategy, buildRegistryNarrative } from './registry_strategy';
export { networkStrategy, buildNetworkNarrative } from './network_strategy';
export { fileStrategy, buildFileNarrative } from './file_strategy';
export {
  processStrategy,
  buildAlertTimelineString,
  buildProcessTimelineString,
} from './process_strategy';
