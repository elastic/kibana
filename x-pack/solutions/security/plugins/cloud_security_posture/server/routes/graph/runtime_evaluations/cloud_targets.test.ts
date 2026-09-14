/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getEuidFromObject,
  getEuidFromObjectForSearch,
} from '@kbn/entity-store/common/domain/euid';
import { getTargetEuidSourceFields } from '../target_euid';
import { buildIntegrationRuntimeEvals } from './enrichment_query';
import { parseEvalSnippet } from './merge_eval';
import { aws_cloudtrail_otelEvaluations } from './integrations/aws_cloudtrail_otel';

const getAwsTargetAssignment = (column: string) => {
  const target = aws_cloudtrail_otelEvaluations.evaluations.find(({ id }) => id === 'target');
  const assignment = parseEvalSnippet(target?.esql ?? '').find((item) => item.column === column);
  if (!assignment) throw new Error(`Missing target assignment: ${column}`);
  return assignment;
};

describe('additive cloud graph target enrichment', () => {
  it('preserves the original IAM fallback even when rpc.service is absent', () => {
    const original = {
      condition:
        'data_stream.dataset == "aws.cloudtrail.otel" AND rpc.method == "AttachUserPolicy" AND aws.request.parameters.userName IS NOT NULL',
      value: 'aws.request.parameters.userName',
    };
    for (const column of ['user.target.id', 'user.target.name']) {
      const assignment = getAwsTargetAssignment(column);
      expect(assignment.hasPreserve).toBe(true);
      expect(assignment.branches[0]).toEqual(original);
    }
    expect(getAwsTargetAssignment('user.target.id').branches).toEqual([original]);
  });

  it('adds IAM user names after the original fallback with dataset and service guards', () => {
    const assignment = getAwsTargetAssignment('user.target.name');
    expect(assignment.branches).toHaveLength(2);
    expect(assignment.branches[1]).toEqual({
      condition:
        'data_stream.dataset == "aws.cloudtrail.otel" AND rpc.service == "iam.amazonaws.com" AND rpc.method IN ("DetachUserPolicy", "CreateUser", "DeleteUser", "UpdateUser", "PutUserPolicy", "DeleteUserPolicy", "CreateAccessKey", "DeleteAccessKey", "UpdateAccessKey") AND aws.request.parameters.userName IS NOT NULL',
      value: 'aws.request.parameters.userName',
    });
    expect(getTargetEuidSourceFields('user')).toContain(assignment.column);
    expect(
      getEuidFromObjectForSearch('user', {
        'user.name': 'alice',
        'data_stream.dataset': 'aws.cloudtrail.otel',
      })
    ).toBe('user:alice@aws');
  });

  it('preserves existing service identities before the new DeleteObject bucket fallback', () => {
    const assignment = getAwsTargetAssignment('service.target.name');
    expect(assignment.hasPreserve).toBe(true);
    expect(assignment.branches).toEqual([
      {
        condition:
          'data_stream.dataset == "aws.cloudtrail.otel" AND rpc.method == "GetCallerIdentity" AND rpc.service IS NOT NULL',
        value: 'rpc.service',
      },
      {
        condition:
          'data_stream.dataset == "aws.cloudtrail.otel" AND rpc.method IN ("PutObject", "GetObject") AND rpc.service IS NOT NULL',
        value: 'rpc.service',
      },
      {
        condition:
          'data_stream.dataset == "aws.cloudtrail.otel" AND rpc.service == "s3.amazonaws.com" AND rpc.method == "DeleteObject" AND aws.request.parameters.bucketName IS NOT NULL',
        value: 'aws.request.parameters.bucketName',
      },
    ]);
    expect(getTargetEuidSourceFields('service')).toEqual([assignment.column]);
    expect(getEuidFromObject('service', { 'service.name': 'example-bucket' })).toBe(
      'service:example-bucket'
    );
    expect(getEuidFromObject('service', { 'service.id': 'example-bucket' })).toBeUndefined();
  });

  it('retains additions after merging without a service-ID-only fallback', () => {
    const query = buildIntegrationRuntimeEvals({ integrations: ['aws_cloudtrail_otel'] });
    expect(query).toContain('aws.request.parameters.bucketName');
    expect(query).toContain('"DeleteUser"');
    expect(query).not.toContain('service.target.id = CASE');
    expect(query).not.toContain('CONCAT(');
  });

  it('retains Azure host, provider, and path target mappings', () => {
    const query = buildIntegrationRuntimeEvals({ integrations: ['azure_app_service'] });
    expect(query).toContain('host.target.id = CASE');
    expect(query).toContain('azure.resource.id');
    expect(query).toContain('host.target.name = CASE');
    expect(query).toContain('azure.resource.provider');
    expect(query).toContain('azure.app_service.properties.cs_uri_stem');
    expect(query).toContain('"url_path"');
  });

  it('retains Vertex request IDs as resolvable generic targets', () => {
    const query = buildIntegrationRuntimeEvals({ integrations: ['gcp_vertexai'] });
    expect(query).toContain('entity.target.id IS NOT NULL');
    expect(query).toContain('gcp.vertexai.prompt_response_logs.request_id');
    expect(getTargetEuidSourceFields('generic')).toEqual(['entity.target.id']);
    expect(getEuidFromObject('generic', { 'entity.id': 'request-123' })).toBe('request-123');
    expect(getEuidFromObject('generic', { 'entity.name': 'model-name' })).toBeUndefined();
  });
});
