/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_BUCKET_COLUMN, buildAlertEuidPipeline } from './alert_euid_pipeline';

const pipelineText = (): string => buildAlertEuidPipeline().join('\n');

describe('buildAlertEuidPipeline', () => {
  it('FORKs stamped alerts away from EUID derivation', () => {
    const query = pipelineText();
    expect(query).toContain('| FORK (');
    expect(query).toContain('WHERE `kibana.alert.entity.id` IS NOT NULL');
    expect(query).toContain('| EVAL _ea_entity_id = `kibana.alert.entity.id`');
    expect(query).toContain('WHERE `kibana.alert.entity.id` IS NULL');
    expect(query).not.toContain('COALESCE(`kibana.alert.entity.id`');
  });

  it('derives typed EUIDs only on the unstamped FORK branch', () => {
    const query = pipelineText();
    const stampedEnd = query.indexOf('WHERE `kibana.alert.entity.id` IS NULL');
    expect(stampedEnd).toBeGreaterThan(-1);
    const stamped = query.slice(0, stampedEnd);
    const derived = query.slice(stampedEnd);
    expect(stamped).not.toContain('user_euid =');
    expect(derived).toContain('user_euid =');
    expect(derived).toContain('host_euid =');
    expect(derived).toContain('service_euid =');
    expect(derived).toContain('_ea_entity_id = MV_DEDUPE(MV_APPEND(MV_APPEND(');
  });

  it('expands _ea_entity_id, filters nulls, deduplicates, then renames to entity.id for the JOIN', () => {
    const pipeline = buildAlertEuidPipeline();
    expect(pipeline).toContain('| MV_EXPAND _ea_entity_id');
    expect(pipeline).toContain('| WHERE _ea_entity_id IS NOT NULL');
    expect(pipeline).toContain('| STATS has_severe_alert = MAX(is_severe_alert) BY _ea_entity_id');
    expect(pipeline).toContain('| RENAME _ea_entity_id AS `entity.id`');
  });

  it('evaluates the fields the EUIDs read before the EUIDs', () => {
    const derived = pipelineText().split('WHERE `kibana.alert.entity.id` IS NULL')[1];
    expect(derived.indexOf('_src_entity_source0 =')).toBeGreaterThan(-1);
    expect(derived.indexOf('_src_entity_source0 =')).toBeLessThan(derived.indexOf('user_euid ='));
  });

  describe('without a bucket', () => {
    it('drops @timestamp and groups by entity only, as before', () => {
      const query = pipelineText();
      expect(query).not.toContain('@timestamp');
      expect(query).not.toContain(ALERT_BUCKET_COLUMN);
      expect(query).toContain('| STATS has_severe_alert = MAX(is_severe_alert) BY _ea_entity_id');
    });

    it('is the same with an undefined bucket', () => {
      expect(buildAlertEuidPipeline(undefined)).toEqual(buildAlertEuidPipeline());
    });
  });

  describe('with a bucket', () => {
    const bucket = 'DATE_DIFF("hour", @timestamp, NOW()) / 6';
    const bucketed = (): string[] => buildAlertEuidPipeline(bucket);
    const bucketedText = (): string => bucketed().join('\n');

    it('keeps @timestamp through both FORK branches', () => {
      const keeps = bucketedText()
        .split('\n')
        .filter((line) => line.includes('KEEP'));
      expect(keeps).toHaveLength(2);
      keeps.forEach((line) => expect(line).toContain('@timestamp'));
      keeps.forEach((line) => expect(line).toContain('`kibana.alert.severity`'));
    });

    it('evaluates the bucket after the severity and before the STATS', () => {
      const pipeline = bucketed();
      const severity = pipeline.indexOf(
        '| EVAL is_severe_alert = `kibana.alert.severity` IN ("high", "critical")'
      );
      const evalBucket = pipeline.indexOf(`| EVAL ${ALERT_BUCKET_COLUMN} = ${bucket}`);
      const stats = pipeline.findIndex((line) => line.startsWith('| STATS'));
      expect(severity).toBeGreaterThan(-1);
      expect(evalBucket).toBeGreaterThan(severity);
      expect(stats).toBeGreaterThan(evalBucket);
    });

    it('gives one row per bucket and entity, still telling whether any alert is severe', () => {
      expect(bucketed()).toContain(
        `| STATS has_severe_alert = MAX(is_severe_alert) BY ${ALERT_BUCKET_COLUMN}, _ea_entity_id`
      );
      expect(bucketed()).toContain('| RENAME _ea_entity_id AS `entity.id`');
    });
  });

  describe('with the alias rows of the entity index in the same FROM', () => {
    const withAliases = (bucket?: string): string =>
      buildAlertEuidPipeline(bucket, {
        alertBranchCondition: 'NOT _index == "e"',
        extraBranch: {
          steps: ['WHERE _index == "e"', '| EVAL _ea_entity_id = x', '| KEEP _ea_entity_id'],
          aggregations: ['alias_watchlisted = MAX(alias_watchlisted)'],
        },
      }).join('\n');

    it('keeps the entity rows out of both alert branches', () => {
      const query = withAliases();
      expect(query).toContain('WHERE (NOT _index == "e") AND `kibana.alert.entity.id` IS NOT NULL');
      expect(query).toContain('WHERE (NOT _index == "e") AND `kibana.alert.entity.id` IS NULL');
    });

    it('adds the extra FORK branch after the two alert branches', () => {
      const query = withAliases();
      expect(query.indexOf('WHERE _index == "e"')).toBeGreaterThan(
        query.indexOf('(NOT _index == "e") AND `kibana.alert.entity.id` IS NULL')
      );
    });

    it('tells an alert row from the other rows, and adds the extra aggregations', () => {
      const query = withAliases();
      expect(query).toContain('| EVAL is_alert_row = `kibana.alert.severity` IS NOT NULL');
      expect(query).toContain(
        '| STATS has_severe_alert = MAX(is_severe_alert), has_alert = MAX(is_alert_row), alias_watchlisted = MAX(alias_watchlisted) BY _ea_entity_id'
      );
    });

    it('is unchanged without the options', () => {
      expect(pipelineText()).not.toContain('is_alert_row');
      expect(pipelineText()).not.toContain('_index');
    });
  });
});
