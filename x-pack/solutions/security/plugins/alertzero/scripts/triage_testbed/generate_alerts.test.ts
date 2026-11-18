/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generate } from './generate_alerts';
import type {
  AlertDoc,
  DeepPartial,
  GeneratedDay,
  GeneratorParams,
  Profile,
  Verdict,
} from './generate_alerts';

// A small profile with the same shape as `profile_phoenix.json`: every cell of the status mix is present.
const profile: Profile = {
  totals: {
    statusSeverityMix: [
      { alerts: 300, buildingBlock: false, severity: 'low', status: 'open' },
      { alerts: 40, buildingBlock: false, severity: 'low', status: 'closed' },
      { alerts: 80, buildingBlock: false, severity: 'high', status: 'open' },
      { alerts: 30, buildingBlock: true, severity: 'low', status: 'open' },
    ],
  },
  unkeyedRules: [
    { alerts: 10, rule: 'Okta User Sessions Started from Different Geolocations', severity: 'low' },
  ],
};

// Large keys, process alerts only and a variant in every eligible alert, so that every random draw of the generator is used.
const params: DeepPartial<GeneratorParams> = {
  meanKeySize: 40,
  keySizeSigma: 1.5,
  badVariantRate: 1,
  entra: { alerts: 50, keys: 5 },
  bursts: { count: 0 },
  kindWeights: { process: 1, cloud: 0, file: 0, registry: 0, library: 0 },
  rulesPerSeverity: { low: 3, medium: 1, high: 2, critical: 1 },
  buildingBlockRules: 2,
};

describe('generate_alerts', () => {
  it('gives identical alerts and truth for the same seed, because a run must be repeatable', () => {
    const first = generate({ profile, seed: 7, params });
    const second = generate({ profile, seed: 7, params });

    // The test is only useful if the run draws random values for the planted variants too.
    const variants = new Set(first.truth.map(({ variant }) => variant).filter(Boolean));
    expect(variants).toContain('encoded_command_line');

    expect(JSON.stringify(second)).toEqual(JSON.stringify(first));
  });

  it('gives different alerts for another seed', () => {
    const first = generate({ profile, seed: 7, params });
    const other = generate({ profile, seed: 8, params });

    expect(JSON.stringify(other.alerts)).not.toEqual(JSON.stringify(first.alerts));
  });

  it('gives every severity and status cell of the profile exactly its count', () => {
    const { alerts } = generate({ profile, seed: 7, params });

    const counts: Record<string, number> = {};
    alerts.forEach(({ _source: doc }) => {
      const cell = [
        Boolean(doc['kibana.alert.building_block_type']),
        doc['kibana.alert.severity'],
        doc['kibana.alert.workflow_status'],
      ].join('|');
      counts[cell] = (counts[cell] ?? 0) + 1;
    });

    const expected = Object.fromEntries(
      profile.totals.statusSeverityMix.map((r) => [
        [r.buildingBlock, r.severity, r.status].join('|'),
        r.alerts,
      ])
    );
    expect(counts).toEqual(expected);
  });

  describe('harmless hash updates (software updates)', () => {
    // No planted variants, so that every new hash in the run is a software update.
    const updating = {
      ...params,
      badVariantRate: 0,
      hashUpdate: { keyShare: 1, laterAlertShare: 1, minKeySize: 4 },
    };
    const hashesByKey = (
      result: GeneratedDay
    ): Map<
      string,
      {
        plain: Set<AlertDoc[string]>;
        updated: Set<AlertDoc[string]>;
        verdict: Verdict;
        variant: string | null;
      }
    > => {
      const byKey = new Map<
        string,
        {
          plain: Set<AlertDoc[string]>;
          updated: Set<AlertDoc[string]>;
          verdict: Verdict;
          variant: string | null;
        }
      >();
      result.alerts.forEach(({ _source: doc }, i) => {
        const { keyId, benign, verdict, variant } = result.truth[i];
        const entry = byKey.get(keyId) ?? {
          plain: new Set(),
          updated: new Set(),
          verdict,
          variant,
        };
        entry[benign ? 'updated' : 'plain'].add(doc['process.hash.sha256']);
        byKey.set(keyId, entry);
      });
      return byKey;
    };

    it('gives some false-positive keys a second hash after an update time, and marks those alerts harmless', () => {
      const result = generate({ profile, seed: 7, params: updating });
      const harmless = result.truth.filter(({ benign }) => benign === 'hash_update');
      const updatedKeys = [...hashesByKey(result).values()].filter(
        (entry) => entry.updated.size > 0
      );

      expect(harmless.length).toBeGreaterThan(0);
      harmless.forEach((t) => {
        expect(t.verdict).toBe('false_positive');
        expect(t.variant).toBeNull();
      });
      updatedKeys.forEach((entry) => {
        // One new hash per key, different from the hash of the alerts before the update.
        expect(entry.updated.size).toBe(1);
        expect(entry.plain.size).toBeLessThanOrEqual(1);
        expect([...entry.plain].some((hash) => entry.updated.has(hash))).toBe(false);
      });
    });

    it('plants no harmless hash when the update share is zero', () => {
      const result = generate({
        profile,
        seed: 7,
        params: { ...updating, hashUpdate: { keyShare: 0, laterAlertShare: 1, minKeySize: 4 } },
      });

      expect(result.truth.filter(({ benign }) => benign !== null)).toEqual([]);
    });

    it('never gives a harmless hash to a true-positive key', () => {
      const result = generate({ profile, seed: 7, params: updating });
      const truePositiveKeys = new Set(
        result.truth
          .filter(({ verdict, variant }) => verdict === 'true_positive' && !variant)
          .map(({ keyId }) => keyId)
      );
      const harmlessKeys = result.truth.filter(({ benign }) => benign).map(({ keyId }) => keyId);

      expect(truePositiveKeys.size).toBeGreaterThan(0);
      expect(harmlessKeys.filter((keyId) => truePositiveKeys.has(keyId))).toEqual([]);
    });
  });

  describe('planted new-hash variants', () => {
    it('change the hash that the novelty guard watches, by kind of key', () => {
      const libraries = {
        ...params,
        badVariantRate: 1,
        hashUpdate: { keyShare: 0, laterAlertShare: 0, minKeySize: 4 },
        kindWeights: { process: 0, cloud: 0, file: 0, registry: 0, library: 1 },
      };
      const result = generate({ profile, seed: 7, params: libraries });
      const planted = result.alerts.filter((_, i) => result.truth[i].variant === 'new_hash');

      expect(planted.length).toBeGreaterThan(0);
      planted.forEach(({ _source: doc }) => {
        expect(doc['dll.hash.sha256']).toBeDefined();
        expect(doc['process.hash.sha256']).toBeUndefined();
      });
    });

    it('are not planted on a kind of key that has no guarded hash', () => {
      const files = {
        ...params,
        badVariantRate: 1,
        kindWeights: { process: 0, cloud: 0, file: 1, registry: 0, library: 0 },
      };
      const result = generate({ profile, seed: 7, params: files });

      expect(result.truth.filter(({ variant }) => variant === 'new_hash')).toEqual([]);
      expect(result.truth.filter(({ variant }) => variant !== null).length).toBeGreaterThan(0);
    });
  });

  describe('context that the prompt of the Alert Analysis workflow shows', () => {
    // The first real run found 14% of the cloud true positives and 0% of the aggregation true positives, because a
    // cloud alert was a bare API call and the count of an aggregation alert was only in a field that the prompt omits.
    const contextProfile: Profile = {
      ...profile,
      unkeyedRules: [
        {
          alerts: 80,
          rule: 'Okta User Sessions Started from Different Geolocations',
          severity: 'low',
        },
        {
          alerts: 80,
          rule: 'AWS S3 Rapid Bucket Posture API Calls from a Single Principal',
          severity: 'low',
        },
        { alerts: 80, rule: 'GKE Anonymous Endpoint Permission Enumeration', severity: 'low' },
        {
          alerts: 80,
          rule: 'GitHub Bot Account Activity from Unmanaged IP Address',
          severity: 'low',
        },
      ],
    };
    const cloudParams = {
      ...params,
      falsePositiveKeyShare: 0.5,
      // A little process weight: building-block rules never get the cloud kind and need another one.
      kindWeights: { process: 0.01, cloud: 1, file: 0, registry: 0, library: 0 },
    };
    const result = generate({ profile: contextProfile, seed: 11, params: cloudParams });
    const docsOf = (kind: string, verdict: Verdict): AlertDoc[] =>
      result.alerts
        .filter((_, i) => result.truth[i].kind === kind && result.truth[i].verdict === verdict)
        .map(({ _source: doc }) => doc);
    const unkeyed = (verdict: Verdict): AlertDoc[] =>
      result.alerts
        .filter(
          (_, i) =>
            result.truth[i].keyId.startsWith('unkeyed-') && result.truth[i].verdict === verdict
        )
        .map(({ _source: doc }) => doc);

    it('keeps the count of an aggregation alert in the threshold result, where a real alert has it, and out of the reason', () => {
      const docs = unkeyed('true_positive').concat(unkeyed('false_positive'));

      expect(docs.length).toBeGreaterThan(0);
      docs.forEach((doc) => {
        expect(typeof doc['kibana.alert.threshold_result.count']).toBe('number');
        // The reason is the default template of Kibana: no count, and no sentence about a usual rate.
        expect(String(doc['kibana.alert.reason'])).not.toMatch(/\d+ events|usual/);
        expect(String(doc['kibana.alert.reason'])).toMatch(
          /^network event( with source [\d.]+)? on host-\d+ created low alert .+\.$/
        );
      });
    });

    it('gives an aggregation true positive a higher count than any false positive, so that the count carries the signal', () => {
      const counts = (verdict: Verdict) =>
        unkeyed(verdict).map((doc) => Number(doc['kibana.alert.threshold_result.count']));

      expect(Math.min(...counts('true_positive'))).toBeGreaterThan(
        Math.max(...counts('false_positive'))
      );
    });

    it('adds the usual count to an aggregation alert only when it is asked for, and changes nothing else', () => {
      const withUsual = generate({
        profile: contextProfile,
        seed: 11,
        params: { ...cloudParams, aggregateUsualCount: true },
      });

      expect(
        result.alerts.every(
          ({ _source: doc }) => !('kibana.alert.threshold_result.usual_count' in doc)
        )
      ).toBe(true);
      expect(withUsual.truth).toEqual(result.truth);
      withUsual.alerts.forEach(({ _id, _source: doc }, i) => {
        const { 'kibana.alert.threshold_result.usual_count': usual, ...rest } = doc;
        expect(_id).toBe(result.alerts[i]._id);
        expect(rest).toEqual(result.alerts[i]._source);
        if (result.truth[i].keyId.startsWith('unkeyed-')) {
          // The count is the usual count times a factor for a true positive, and up to twice the usual count for a false positive.
          const count = Number(doc['kibana.alert.threshold_result.count']);
          expect(typeof usual).toBe('number');
          expect(count / Number(usual)).toBeGreaterThanOrEqual(1);
          expect(count / Number(usual) >= 15).toBe(result.truth[i].verdict === 'true_positive');
        } else {
          expect(usual).toBeUndefined();
        }
      });
    });

    it('gives no threshold result to an alert that is not an aggregation alert', () => {
      const others = result.alerts.filter((_, i) => !result.truth[i].keyId.startsWith('unkeyed-'));

      expect(others.length).toBeGreaterThan(0);
      others.forEach(({ _source: doc }) => {
        expect(doc['kibana.alert.threshold_result.count']).toBeUndefined();
      });
    });

    it('gives a cloud true positive a change by root in an unusual region, and a false positive a read by a service role', () => {
      const bad = docsOf('cloud', 'true_positive');
      const good = docsOf('cloud', 'false_positive');

      expect(bad.length).toBeGreaterThan(0);
      expect(good.length).toBeGreaterThan(0);
      bad.forEach((doc) => {
        expect(doc['event.type']).toEqual(['change']);
        expect(doc['user.id']).toBe('root');
        expect(doc['user.asset.criticality']).toBe('extreme_impact');
        expect(['af-south-1', 'ap-southeast-3', 'me-central-1']).toContain(doc['cloud.region']);
        expect(doc['user.risk.calculated_level']).toBe('High');
      });
      good.forEach((doc) => {
        expect(doc['event.type']).toEqual(['info']);
        expect(['ci-deploy', 'backup-agent', 'monitoring', 'inventory-sync']).toContain(
          doc['user.id']
        );
        expect(doc['user.asset.criticality']).toBe('low_impact');
        expect(['eu-west-1', 'us-east-1', 'eu-central-1']).toContain(doc['cloud.region']);
        expect(doc['user.risk.calculated_level']).toBe('Low');
      });
    });

    const FAMILY_ACTIONS: Record<string, string[]> = {
      'AWS S3 Rapid Bucket Posture API Calls from a Single Principal': [
        'GetBucketAcl',
        'GetBucketPolicy',
        'GetBucketPublicAccessBlock',
        'GetBucketEncryption',
      ],
      'GKE Anonymous Endpoint Permission Enumeration': [
        'io.k8s.core.v1.pods.list',
        'io.k8s.rbac.v1.clusterroles.list',
        'io.k8s.core.v1.secrets.list',
      ],
      'Okta User Sessions Started from Different Geolocations': [
        'user.session.start',
        'user.authentication.sso',
      ],
      'GitHub Bot Account Activity from Unmanaged IP Address': ['git.clone', 'repo.download_zip'],
    };

    it('gives both verdicts of a rule the actions of its family, because a real model compares the alert with what the rule claims to detect', () => {
      const docs = unkeyed('true_positive').concat(unkeyed('false_positive'));
      const names = new Set(docs.map((doc) => doc['kibana.alert.rule.name']));

      expect([...names].sort()).toEqual(Object.keys(FAMILY_ACTIONS).sort());
      docs.forEach((doc) => {
        expect(FAMILY_ACTIONS[doc['kibana.alert.rule.name']]).toContain(doc['event.action']);
      });
    });

    it('puts the truth of an aggregation alert in the actor and the context, as an analyst reads it', () => {
      const bad = unkeyed('true_positive');
      const good = unkeyed('false_positive');

      expect(bad.length).toBeGreaterThan(0);
      expect(good.length).toBeGreaterThan(0);
      bad.forEach((doc) => {
        expect(doc['event.outcome']).toBe('success');
        expect([
          'root',
          'system:anonymous',
          'admin-impersonation',
          'unmanaged-device-bot',
        ]).toContain(doc['user.id']);
        expect(doc['user.risk.calculated_level']).toBe('High');
        expect(doc['host.risk.calculated_level']).toBe('Critical');
        expect(doc['user.asset.criticality']).toBe('extreme_impact');
      });
      good.forEach((doc) => {
        expect(['config-scanner', 'monitoring-agent', 'svc-directory-sync', 'ci-bot']).toContain(
          doc['user.id']
        );
        expect(doc['user.risk.calculated_level']).toBe('Low');
        expect(doc['host.risk.calculated_level']).toBe('Low');
        expect(doc['user.asset.criticality']).toBe('low_impact');
      });
    });

    it('gives a GCP rule region names of GCP and an AWS rule region names of AWS, because a model notices the mix', () => {
      const docs = unkeyed('true_positive').concat(unkeyed('false_positive'));
      const gke = docs.filter(
        (doc) => doc['kibana.alert.rule.name'] === 'GKE Anonymous Endpoint Permission Enumeration'
      );
      const aws = docs.filter((doc) => doc['kibana.alert.rule.name'].startsWith('AWS S3'));

      expect(gke.length).toBeGreaterThan(0);
      gke.forEach((doc) => {
        expect([
          'us-east1',
          'europe-west1',
          'europe-west4',
          'africa-south1',
          'me-central2',
          'asia-southeast2',
        ]).toContain(doc['cloud.region']);
      });
      aws.forEach((doc) => {
        expect([
          'eu-west-1',
          'us-east-1',
          'eu-central-1',
          'af-south-1',
          'ap-southeast-3',
          'me-central-1',
        ]).toContain(doc['cloud.region']);
      });
    });

    it('gives an AWS or GCP rule a provider and a region, and an Okta or GitHub rule only its dataset', () => {
      const docs = unkeyed('true_positive').concat(unkeyed('false_positive'));
      const of = (rule: string): AlertDoc[] =>
        docs.filter((doc) => doc['kibana.alert.rule.name'] === rule);

      expect(
        of('AWS S3 Rapid Bucket Posture API Calls from a Single Principal').length
      ).toBeGreaterThan(0);
      of('AWS S3 Rapid Bucket Posture API Calls from a Single Principal').forEach((doc) => {
        expect(doc['cloud.provider']).toBe('aws');
        expect(doc['event.dataset']).toBe('aws.cloudtrail');
        expect(doc['cloud.region']).toBeDefined();
      });
      of('GitHub Bot Account Activity from Unmanaged IP Address').forEach((doc) => {
        expect(doc['event.dataset']).toBe('github.audit');
        expect(doc['cloud.provider']).toBeUndefined();
      });
    });

    it('adds no user name and no account to an aggregation alert, because an action alone does not give a strict key', () => {
      const docs = unkeyed('true_positive').concat(unkeyed('false_positive'));

      expect(docs.length).toBeGreaterThan(0);
      docs.forEach((doc) => {
        expect(doc['event.action']).toBeDefined();
        expect(doc['user.name']).toBeUndefined();
        expect(doc['cloud.account.id']).toBeUndefined();
      });
    });

    it('gives the same context for the same seed, because it comes from hashes and not from the random stream', () => {
      const again = generate({ profile: contextProfile, seed: 11, params: cloudParams });

      expect(JSON.stringify(again.alerts)).toEqual(JSON.stringify(result.alerts));
    });
  });
});
