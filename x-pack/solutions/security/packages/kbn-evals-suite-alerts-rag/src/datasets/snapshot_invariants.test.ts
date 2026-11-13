/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  ALERTS_RAG_EXPECTED_FACTS,
  allRuleAlertCounts,
  type AlertCountByName,
  type AlertExamplesFacts,
} from './alerts_rag_expected_facts';
import { verifyAlertsRagSnapshot } from './snapshot_invariants';

interface TermsBucket {
  key: string;
  doc_count: number;
}

interface Buckets {
  buckets: TermsBucket[];
}

interface TierBucket extends TermsBucket {
  rules: Buckets;
  hosts: Buckets;
  risk_score: { min: number | null; max: number | null };
}

interface MutableAggregations {
  severities?: Buckets;
  hosts?: Buckets;
  users?: Buckets;
  rules?: Buckets;
  risk_score?: { min: number | null; max: number | null };
  by_severity?: { buckets: TierBucket[] };
  newest_alert?: { hits: { hits: Array<{ _source?: Record<string, unknown> }> } };
  last_hour?: { doc_count: number };
  /** The response's `filters` agg, keyed by example-alert label. */
  example_alerts?: { buckets: Record<string, { doc_count: number }> };
}

interface MutableResponse {
  hits: { total: { value: number } };
  aggregations: MutableAggregations;
}

const toBuckets = (counts: readonly AlertCountByName[]): TermsBucket[] =>
  counts.map(({ name, count }) => ({ key: name, doc_count: count }));

const buildTierBucket = (tier: 'critical' | 'high'): TierBucket => {
  const facts = ALERTS_RAG_EXPECTED_FACTS.severities[tier];
  return {
    key: tier,
    doc_count: facts.count,
    rules: { buckets: toBuckets(facts.rules) },
    hosts: { buckets: toBuckets(facts.hosts) },
    risk_score: { min: facts.riskScore, max: facts.riskScore },
  };
};

const newestAlertSource = (example: AlertExamplesFacts): Record<string, unknown> => ({
  '@timestamp': example.timestamp,
  kibana: {
    alert: {
      rule: { name: example.ruleName },
      severity: example.severity,
    },
  },
  host: { name: example.hostName },
  user: { name: example.userName },
});

/** The labels `buildExampleAlertChecks` uses, in the same order. */
const exampleAlertLabels = (): string[] => [
  'most recent alert',
  ...ALERTS_RAG_EXPECTED_FACTS.criticalAlertExamples.map(
    (_example, index) => `critical-tier example ${index + 1}`
  ),
  'lowest-severity example',
];

/** An aggregation response in which every pinned fact holds. */
const buildValidResponse = (): MutableResponse => {
  const facts = ALERTS_RAG_EXPECTED_FACTS;
  return {
    hits: { total: { value: facts.totalOpenAlerts } },
    aggregations: {
      severities: {
        buckets: [
          { key: 'critical', doc_count: facts.severities.critical.count },
          { key: 'high', doc_count: facts.severities.high.count },
        ],
      },
      hosts: { buckets: toBuckets(facts.hostAlertCounts) },
      users: { buckets: toBuckets(facts.userAlertCounts) },
      rules: { buckets: toBuckets(allRuleAlertCounts()) },
      risk_score: { min: facts.riskScoreRange.min, max: facts.riskScoreRange.max },
      by_severity: { buckets: [buildTierBucket('critical'), buildTierBucket('high')] },
      newest_alert: { hits: { hits: [{ _source: newestAlertSource(facts.mostRecentAlert) }] } },
      last_hour: { doc_count: 0 },
      example_alerts: {
        buckets: Object.fromEntries(exampleAlertLabels().map((label) => [label, { doc_count: 1 }])),
      },
    },
  };
};

const createMocks = (mutate?: (response: MutableResponse) => void) => {
  const response = buildValidResponse();
  mutate?.(response);

  const esClient = {
    search: jest.fn().mockResolvedValue(response),
  } as unknown as Client;

  const log = {
    info: jest.fn(),
    warning: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  } as unknown as ToolingLog;

  return { esClient, log };
};

const facts = ALERTS_RAG_EXPECTED_FACTS;
const criticalFacts = facts.severities.critical;
const highFacts = facts.severities.high;

describe('verifyAlertsRagSnapshot', () => {
  it('resolves when the restored snapshot matches every pinned fact', async () => {
    const { esClient, log } = createMocks();
    await expect(verifyAlertsRagSnapshot({ esClient, log })).resolves.toBeUndefined();
    expect(log.info).toHaveBeenCalledWith(expect.stringContaining('snapshot matches the dataset'));
  });

  it('runs a single ES round-trip and queries open alerts on the alert index pattern', async () => {
    const { esClient, log } = createMocks();
    await verifyAlertsRagSnapshot({ esClient, log });
    expect(esClient.search).toHaveBeenCalledTimes(1);
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: '.internal.alerts-security.alerts-default-*',
        query: { term: { 'kibana.alert.workflow_status': 'open' } },
      })
    );
  });

  it('rejects when the open-alert total drifts from the reference answers', async () => {
    const { esClient, log } = createMocks((response) => {
      response.hits.total.value = facts.totalOpenAlerts - 1;
    });
    await expect(verifyAlertsRagSnapshot({ esClient, log })).rejects.toThrow(
      new RegExp(
        `open alerts: dataset reference answers describe ${facts.totalOpenAlerts} open alerts, ` +
          `snapshot has ${facts.totalOpenAlerts - 1}`
      )
    );
  });

  it('rejects when a pinned severity count drifts', async () => {
    const { esClient, log } = createMocks((response) => {
      const bucket = response.aggregations.severities?.buckets.find((b) => b.key === 'critical');
      bucket!.doc_count = criticalFacts.count - 1;
    });
    await expect(verifyAlertsRagSnapshot({ esClient, log })).rejects.toThrow(
      new RegExp(
        `severity "critical": dataset reference answers state ${criticalFacts.count} open alert\\(s\\), ` +
          `snapshot has ${criticalFacts.count - 1}`
      )
    );
  });

  it('rejects when a pinned severity is absent from the snapshot', async () => {
    const { esClient, log } = createMocks((response) => {
      response.aggregations.severities!.buckets = [{ key: 'high', doc_count: highFacts.count }];
    });
    await expect(verifyAlertsRagSnapshot({ esClient, log })).rejects.toThrow(
      /severity "critical": dataset reference answers state \d+ open alert\(s\), but the snapshot has no such value/
    );
  });

  it('rejects when a pinned host count drifts', async () => {
    const host = facts.hostAlertCounts[0];
    const { esClient, log } = createMocks((response) => {
      const bucket = response.aggregations.hosts?.buckets.find((b) => b.key === host.name);
      bucket!.doc_count = host.count - 1;
    });
    await expect(verifyAlertsRagSnapshot({ esClient, log })).rejects.toThrow(
      new RegExp(
        `host\\.name "${host.name}": dataset reference answers state ${host.count} open alert\\(s\\)`
      )
    );
  });

  it('rejects when the snapshot has a host the reference answers never mention', async () => {
    const { esClient, log } = createMocks((response) => {
      response.aggregations.hosts!.buckets.push({ key: 'SRVUNPINNED01', doc_count: 1 });
    });
    await expect(verifyAlertsRagSnapshot({ esClient, log })).rejects.toThrow(
      /host\.name "SRVUNPINNED01": present in the snapshot but absent from the dataset's reference answers/
    );
  });

  it('rejects when a pinned user count drifts', async () => {
    const user = facts.userAlertCounts[0];
    const { esClient, log } = createMocks((response) => {
      const bucket = response.aggregations.users?.buckets.find((b) => b.key === user.name);
      bucket!.doc_count = user.count - 1;
    });
    await expect(verifyAlertsRagSnapshot({ esClient, log })).rejects.toThrow(
      new RegExp(
        `user\\.name "${user.name}": dataset reference answers state ${user.count} open alert\\(s\\)`
      )
    );
  });

  it('rejects when a global rule count drifts', async () => {
    const rule = allRuleAlertCounts()[0];
    const { esClient, log } = createMocks((response) => {
      const bucket = response.aggregations.rules?.buckets.find((b) => b.key === rule.name);
      bucket!.doc_count = rule.count - 1;
    });
    await expect(verifyAlertsRagSnapshot({ esClient, log })).rejects.toThrow(
      new RegExp(
        `kibana\\.alert\\.rule\\.name "${rule.name}": dataset reference answers state ${rule.count}`
      )
    );
  });

  it('rejects when the risk_score range drifts', async () => {
    const { esClient, log } = createMocks((response) => {
      response.aggregations.risk_score!.max = facts.riskScoreRange.max - 1;
    });
    await expect(verifyAlertsRagSnapshot({ esClient, log })).rejects.toThrow(
      new RegExp(
        `risk_score range: dataset reference answers state ${facts.riskScoreRange.min}-` +
          `${facts.riskScoreRange.max}`
      )
    );
  });

  it('rejects when a tier is absent from the by_severity breakdown', async () => {
    const { esClient, log } = createMocks((response) => {
      response.aggregations.by_severity!.buckets = [buildTierBucket('high')];
    });
    await expect(verifyAlertsRagSnapshot({ esClient, log })).rejects.toThrow(
      new RegExp(
        `critical tier: absent from the snapshot, but the dataset's reference answers describe ` +
          `${criticalFacts.count} critical open alert\\(s\\)`
      )
    );
  });

  it('rejects when a tier is not uniform in risk_score', async () => {
    const { esClient, log } = createMocks((response) => {
      const bucket = response.aggregations.by_severity?.buckets.find((b) => b.key === 'critical');
      bucket!.risk_score.max = criticalFacts.riskScore - 1;
    });
    await expect(verifyAlertsRagSnapshot({ esClient, log })).rejects.toThrow(
      new RegExp(
        `critical risk_score: dataset reference answers state every critical open alert has ` +
          `risk_score ${criticalFacts.riskScore}`
      )
    );
  });

  it('rejects when a tier-scoped rule count drifts', async () => {
    const rule = criticalFacts.rules[0];
    const { esClient, log } = createMocks((response) => {
      const bucket = response.aggregations.by_severity?.buckets.find((b) => b.key === 'critical');
      const ruleBucket = bucket!.rules.buckets.find((b) => b.key === rule.name);
      ruleBucket!.doc_count = rule.count - 1;
    });
    await expect(verifyAlertsRagSnapshot({ esClient, log })).rejects.toThrow(
      new RegExp(
        `critical kibana\\.alert\\.rule\\.name "${rule.name}": dataset reference answers state ${rule.count}`
      )
    );
  });

  it('rejects when a tier-scoped host count drifts', async () => {
    const host = criticalFacts.hosts[0];
    const { esClient, log } = createMocks((response) => {
      const bucket = response.aggregations.by_severity?.buckets.find((b) => b.key === 'critical');
      const hostBucket = bucket!.hosts.buckets.find((b) => b.key === host.name);
      hostBucket!.doc_count = host.count - 1;
    });
    await expect(verifyAlertsRagSnapshot({ esClient, log })).rejects.toThrow(
      new RegExp(
        `critical host\\.name "${host.name}": dataset reference answers state ${host.count}`
      )
    );
  });

  it('rejects when the newest alert does not match the "most recent alert" reference answer', async () => {
    const { esClient, log } = createMocks((response) => {
      const source = response.aggregations.newest_alert!.hits.hits[0]._source!;
      source['@timestamp'] = '2026-03-26T22:12:18.000Z';
    });
    await expect(verifyAlertsRagSnapshot({ esClient, log })).rejects.toThrow(
      new RegExp(
        `newest open alert @timestamp: dataset reference answer states ` +
          `"${facts.mostRecentAlert.timestamp}", snapshot has "2026-03-26T22:12:18.000Z"`
      )
    );
  });

  it('rejects when the newest alert has no user.name', async () => {
    const { esClient, log } = createMocks((response) => {
      const source = response.aggregations.newest_alert!.hits.hits[0]._source!;
      source.user = {};
    });
    await expect(verifyAlertsRagSnapshot({ esClient, log })).rejects.toThrow(
      /newest open alert user\.name: dataset reference answer states/
    );
  });

  it('rejects when no open alert exists to verify the "most recent alert" answer', async () => {
    const { esClient, log } = createMocks((response) => {
      response.aggregations.newest_alert!.hits.hits = [];
    });
    await expect(verifyAlertsRagSnapshot({ esClient, log })).rejects.toThrow(
      /no open alert found, so the "most recent alert" reference answer cannot be verified/
    );
  });

  it('rejects when an open alert lands inside the "no new alerts in the last hour" window', async () => {
    const { esClient, log } = createMocks((response) => {
      response.aggregations.last_hour!.doc_count = 4;
    });
    await expect(verifyAlertsRagSnapshot({ esClient, log })).rejects.toThrow(
      /last hour: snapshot has 4 open alert\(s\) inside now-1h/
    );
  });

  it('rejects when an example alert named by the reference answers no longer exists', async () => {
    const { esClient, log } = createMocks((response) => {
      response.aggregations.example_alerts!.buckets = {
        ...response.aggregations.example_alerts?.buckets,
        'critical-tier example 2': { doc_count: 0 },
      };
    });
    await expect(verifyAlertsRagSnapshot({ esClient, log })).rejects.toThrow(
      /example alert "critical-tier example 2": the reference answers name .+ but the snapshot has no matching open alert/
    );
  });

  it('rejects when an example alert filter is missing from the response entirely', async () => {
    const { esClient, log } = createMocks((response) => {
      response.aggregations.example_alerts!.buckets = {};
    });
    await expect(verifyAlertsRagSnapshot({ esClient, log })).rejects.toThrow(
      /example alert "most recent alert": the reference answers name/
    );
  });

  it('reports every violation in a single error so one CI log scan shows all drift', async () => {
    const { esClient, log } = createMocks((response) => {
      response.hits.total.value = 0;
      response.aggregations.severities!.buckets = [];
      response.aggregations.hosts!.buckets = [];
      response.aggregations.users!.buckets = [];
      response.aggregations.rules!.buckets = [];
      response.aggregations.by_severity!.buckets = [];
      response.aggregations.newest_alert!.hits.hits = [];
      response.aggregations.example_alerts!.buckets = {};
    });

    await expect(verifyAlertsRagSnapshot({ esClient, log })).rejects.toThrow(
      /Violations:[\s\S]+1\.[\s\S]+2\.[\s\S]+3\.[\s\S]+4\.[\s\S]+5\.[\s\S]+6\.[\s\S]+7\./
    );
  });

  it('names the snapshot and the facts module in the failure message so the fix is obvious', async () => {
    const { esClient, log } = createMocks((response) => {
      response.hits.total.value = 0;
    });
    await expect(verifyAlertsRagSnapshot({ esClient, log })).rejects.toThrow(
      /alerts_rag_expected_facts\.ts/
    );
  });

  it('reports violations instead of throwing a TypeError on a non-restored cluster', async () => {
    const { esClient, log } = createMocks((response) => {
      response.hits.total.value = 0;
      response.aggregations = {
        severities: { buckets: [] },
        hosts: { buckets: [] },
        users: { buckets: [] },
        rules: { buckets: [] },
        risk_score: { min: null, max: null },
        by_severity: { buckets: [] },
        newest_alert: { hits: { hits: [] } },
        last_hour: { doc_count: 0 },
        example_alerts: { buckets: {} },
      };
    });

    expect.assertions(2);
    try {
      await verifyAlertsRagSnapshot({ esClient, log });
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain(
        `open alerts: dataset reference answers describe ${facts.totalOpenAlerts} open alerts, snapshot has 0`
      );
      expect(message).not.toMatch(/TypeError|Cannot read/);
    }
  });

  it('reports violations when the response has no aggregations key at all', async () => {
    const { esClient } = createMocks();
    (esClient.search as jest.Mock).mockResolvedValue({
      hits: { total: { value: 0 } },
    });
    const log = {
      info: jest.fn(),
      warning: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    } as unknown as ToolingLog;

    expect.assertions(2);
    try {
      await verifyAlertsRagSnapshot({ esClient, log });
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain('Violations:');
      expect(message).not.toMatch(/TypeError|Cannot read/);
    }
  });
});
