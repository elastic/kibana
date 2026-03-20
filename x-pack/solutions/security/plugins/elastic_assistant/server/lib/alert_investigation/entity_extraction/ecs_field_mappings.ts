/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObservableTypeKey } from '../types';

interface EcsFieldMapping {
  readonly ecsField: string;
  readonly observableType: ObservableTypeKey;
  readonly detectIpVersion?: boolean;
}

/**
 * Mapping from ECS fields to observable types.
 * When detectIpVersion is true, the runtime value determines ipv4 vs ipv6.
 */
export const ECS_FIELD_MAPPINGS: readonly EcsFieldMapping[] = [
  { ecsField: 'source.ip', observableType: 'ipv4', detectIpVersion: true },
  { ecsField: 'destination.ip', observableType: 'ipv4', detectIpVersion: true },
  { ecsField: 'client.ip', observableType: 'ipv4', detectIpVersion: true },
  { ecsField: 'server.ip', observableType: 'ipv4', detectIpVersion: true },
  { ecsField: 'host.ip', observableType: 'ipv4', detectIpVersion: true },
  { ecsField: 'network.forwarded_ip', observableType: 'ipv4', detectIpVersion: true },

  { ecsField: 'host.name', observableType: 'hostname' },
  { ecsField: 'host.hostname', observableType: 'hostname' },
  { ecsField: 'observer.hostname', observableType: 'hostname' },

  { ecsField: 'user.name', observableType: 'user' },
  { ecsField: 'user.id', observableType: 'user' },
  { ecsField: 'user.email', observableType: 'email' },
  { ecsField: 'user.target.name', observableType: 'user' },
  { ecsField: 'user.effective.name', observableType: 'user' },

  { ecsField: 'process.name', observableType: 'process' },
  { ecsField: 'process.executable', observableType: 'process' },
  { ecsField: 'process.parent.name', observableType: 'process' },
  { ecsField: 'process.parent.executable', observableType: 'process' },

  { ecsField: 'file.hash.sha256', observableType: 'file_hash' },
  { ecsField: 'file.hash.sha1', observableType: 'file_hash' },
  { ecsField: 'file.hash.md5', observableType: 'file_hash' },

  { ecsField: 'file.path', observableType: 'file_path' },
  { ecsField: 'file.name', observableType: 'file_path' },

  { ecsField: 'url.full', observableType: 'url' },
  { ecsField: 'url.original', observableType: 'url' },

  { ecsField: 'dns.question.name', observableType: 'domain' },
  { ecsField: 'url.domain', observableType: 'domain' },
  { ecsField: 'destination.domain', observableType: 'domain' },

  { ecsField: 'agent.id', observableType: 'agent_id' },

  { ecsField: 'registry.path', observableType: 'registry' },
  { ecsField: 'registry.key', observableType: 'registry' },

  { ecsField: 'service.name', observableType: 'service' },
];

export const getEcsFieldMappings = (): readonly EcsFieldMapping[] => ECS_FIELD_MAPPINGS;
