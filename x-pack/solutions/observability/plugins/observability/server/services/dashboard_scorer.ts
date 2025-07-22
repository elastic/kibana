/**
 * @file kibana_dashboard_scorer.ts
 * @description A TypeScript module for scoring related dashboards for a given Kibana alert.
 * This implementation uses a hybrid approach, combining multiple signals to produce a relevance score.
 */

export interface RankablePanel {
  title: string;
  // Fields queried by this specific panel
  queriedFields: string[];
}

export interface RankableDashboard {
  id: string;
  title: string;
  description: string;
  panels: RankablePanel[];
  // The index pattern(s) the dashboard's panels query
  indexPatterns: string[];
  // Use a Date object for easier calculations
  lastModifiedDate: Date;
  // A flag to identify system-provided dashboards
  isManaged: boolean;
}

export interface RankSourceAlert {
  name: string;
  description: string;
  // Fields mentioned or used in the alert's query
  queriedFields: string[];
  // The index pattern the alert runs against
  indexPattern: string;
}

export interface ScoredDashboard {
  dashboard: RankableDashboard;
  score: number;
  // For transparency, we can break down how the score was calculated
  scoreBreakdown: {
    fieldScore: number;
    textScore: number;
    recencyBonus: number;
    defaultPenalty: number;
    finalScore: number;
  };
}

export class DashboardScorer {
  private alert: RankSourceAlert;
  private alertTextTokens: Set<string>;

  // --- SCORING WEIGHTS ---
  // These can be tuned to adjust the influence of each component on the final score.
  private readonly W_FIELD = 0.5; // Weight for field matching score
  private readonly W_TEXT = 0.3; // Weight for text similarity score
  private readonly W_RECENCY = 0.2; // Weight for the recency bonus

  // --- PENALTIES & BONUSES ---
  private readonly DEFAULT_DASHBOARD_PENALTY = 0.4; // Multiplicative penalty for default dashboards
  private readonly RECENCY_DECAY_RATE = 0.01; // Controls how quickly the recency bonus diminishes

  constructor(alert: RankSourceAlert) {
    this.alert = alert;
    // Pre-process alert text for efficiency
    this.alertTextTokens = this.tokenizeAndClean(`${alert.name} ${alert.description}`);
  }

  /**
   * Scores a list of dashboards and returns them sorted by relevance.
   * @param dashboards - An array of dashboards to score.
   * @returns A sorted array of ScoredDashboard objects.
   */
  public getScores(dashboards: RankableDashboard[]): ScoredDashboard[] {
    const scored = dashboards.map((dashboard) => this.calculateCombinedScore(dashboard));

    // Sort dashboards in descending order of score
    scored.sort((a, b) => b.score - a.score);

    return scored;
  }

  /**
   * Calculates the final combined score for a single dashboard.
   * This method orchestrates the different scoring components.
   */
  private calculateCombinedScore(dashboard: RankableDashboard): ScoredDashboard {
    // 1. Calculate the core scores for field and text matching
    const fieldScore = this.calculateFieldScore(dashboard);
    const textScore = this.calculateTextSimilarity(dashboard);

    // 2. Calculate bonuses and penalties
    const recencyBonus = this.calculateRecencyBonus(dashboard);
    const defaultPenalty = this.getDefaultDashboardPenalty(dashboard);

    // 3. Combine scores using a weighted average
    // The base score is a weighted sum of the content-based scores.
    const baseScore = this.W_FIELD * fieldScore + this.W_TEXT * textScore;

    // 4. Apply recency bonus and default penalty
    // Recency bonus is added to the weighted score.
    // Default penalty is applied multiplicatively to reduce the score.
    let finalScore = (baseScore + this.W_RECENCY * recencyBonus) * defaultPenalty;

    // Ensure score is capped between 0 and 1
    finalScore = Math.max(0, Math.min(finalScore, 1));

    return {
      dashboard,
      score: finalScore,
      scoreBreakdown: {
        fieldScore,
        textScore,
        recencyBonus,
        defaultPenalty,
        finalScore,
      },
    };
  }

  /**
   * Calculates a score based on shared fields, factoring in frequency.
   * This is more nuanced than a simple intersection/union.
   * We'll use cosine similarity on term frequency vectors.
   */
  private calculateFieldScore(dashboard: RankableDashboard): number {
    const alertFields = new Set<string>([...this.alert.queriedFields, this.alert.indexPattern]);

    // Create a frequency map for dashboard fields (including index patterns)
    const dashboardFieldFreq = new Map<string, number>();
    const allDashboardFields = dashboard.panels
      .flatMap((p) => p.queriedFields)
      .concat(dashboard.indexPatterns);

    for (const field of allDashboardFields) {
      dashboardFieldFreq.set(field, (dashboardFieldFreq.get(field) || 0) + 1);
    }

    const allUniqueFields = new Set([...alertFields, ...dashboardFieldFreq.keys()]);

    if (allUniqueFields.size === 0) {
      return 0;
    }

    // Create vectors
    let dotProduct = 0;
    let magA = 0;
    let magB = 0;

    for (const field of allUniqueFields) {
      const alertVectorVal = alertFields.has(field) ? 1 : 0;
      const dashboardVectorVal = dashboardFieldFreq.get(field) || 0;

      dotProduct += alertVectorVal * dashboardVectorVal;
      magA += alertVectorVal * alertVectorVal;
      magB += dashboardVectorVal * dashboardVectorVal;
    }

    magA = Math.sqrt(magA);
    magB = Math.sqrt(magB);

    if (magA === 0 || magB === 0) {
      return 0;
    }

    return dotProduct / (magA * magB);
  }

  /**
   * Calculates a score based on textual similarity of names and descriptions.
   * Uses Jaccard similarity on tokenized text, which is simpler than TF-IDF.
   */
  private calculateTextSimilarity(dashboard: RankableDashboard): number {
    const dashboardText = dashboard.title + ' ' + dashboard.panels.map((p) => p.title).join(' ');
    const dashboardTokens = this.tokenizeAndClean(dashboardText);

    const intersection = new Set(
      [...this.alertTextTokens].filter((token) => dashboardTokens.has(token))
    );
    const union = new Set([...this.alertTextTokens, ...dashboardTokens]);

    if (union.size === 0) {
      return 0;
    }

    return intersection.size / union.size;
  }

  /**
   * Applies a bonus for recently modified dashboards using an exponential decay function.
   * The more recent the modification, the closer the bonus is to 1.
   */
  private calculateRecencyBonus(dashboard: RankableDashboard): number {
    const now = new Date();
    const ageInMillis = now.getTime() - dashboard.lastModifiedDate.getTime();
    const ageInDays = ageInMillis / (1000 * 60 * 60 * 24);

    // Exponential decay: bonus = e^(-k * age)
    const bonus = Math.exp(-this.RECENCY_DECAY_RATE * ageInDays);
    return bonus;
  }

  /**
   * Applies a penalty if the dashboard is a default one.
   * Returns a multiplier (e.g., 0.4 if it's a default, 1.0 if not).
   */
  private getDefaultDashboardPenalty(dashboard: RankableDashboard): number {
    return dashboard.isManaged ? this.DEFAULT_DASHBOARD_PENALTY : 1.0;
  }

  /**
   * A simple text processing utility.
   * Converts text to lowercase, splits into words, and removes common stop words.
   */
  private tokenizeAndClean(text: string): Set<string> {
    const stopWords = new Set([
      'a',
      'an',
      'the',
      'and',
      'or',
      'in',
      'on',
      'for',
      'to',
      'with',
      'is',
      'of',
      'at',
    ]);

    const tokens = text
      .toLowerCase()
      // Remove non-alphanumeric characters but keep hyphens and underscores
      .replace(/[^a-z0-9\s\-_]/g, '')
      .split(/\s+/)
      .filter((token) => token && !stopWords.has(token));

    return new Set(tokens);
  }
}

// --- 3. EXAMPLE USAGE ---

// Mock Data
const exampleAlert: RankSourceAlert = {
  name: 'High CPU Usage on web-server-01',
  description:
    'CPU utilization has exceeded 90% for the last 5 minutes. Associated service: nginx.',
  queriedFields: ['system.cpu.total.norm.pct', 'host.name', 'service.name'],
  indexPattern: 'metrics-system-*',
};

const exampleDashboards: RankableDashboard[] = [
  {
    id: 'dash-1',
    title: 'Overall System Performance',
    panels: [
      { title: 'CPU Usage Over Time', queriedFields: ['system.cpu.total.norm.pct', 'host.name'] },
      { title: 'Memory Usage', queriedFields: ['system.memory.actual.used.pct'] },
    ],
    indexPatterns: ['metrics-system-*'],
    lastModifiedDate: new Date(new Date().setDate(new Date().getDate() - 5)), // 5 days ago
    isManaged: false,
  },
  {
    id: 'dash-2',
    title: '[Default] Web Server Monitoring',
    panels: [
      { title: 'Nginx Request Rate', queriedFields: ['nginx.stubstatus.requests'] },
      { title: 'Active Connections', queriedFields: ['nginx.stubstatus.connections.active'] },
    ],
    indexPatterns: ['metrics-nginx-*'],
    lastModifiedDate: new Date(new Date().setDate(new Date().getDate() - 300)), // 300 days ago
    isManaged: true,
  },
  {
    id: 'dash-3',
    title: 'Nginx Performance Analysis',
    panels: [
      {
        title: 'CPU Load by Service',
        queriedFields: ['system.cpu.total.norm.pct', 'service.name'],
      },
      { title: 'Web Traffic by Host', queriedFields: ['nginx.access.url', 'host.name'] },
    ],
    indexPatterns: ['metrics-system-*', 'metrics-nginx-*'],
    lastModifiedDate: new Date(new Date().setDate(new Date().getDate() - 1)), // Yesterday
    isManaged: false,
  },
  {
    id: 'dash-4',
    title: 'Database Query Times',
    panels: [{ title: 'Slowest Queries', queriedFields: ['db.query.time.ms'] }],
    indexPatterns: ['metrics-db-*'],
    lastModifiedDate: new Date(), // Today
    isManaged: false,
  },
];

/*
// --- RUN THE SCORER ---
console.log('--- Kibana Related Dashboard Scorer ---');
console.log(`Alert: "${exampleAlert.name}"\n`);

const scorer = new DashboardScorer(exampleAlert);
const results = scorer.getScores(exampleDashboards);

console.log('--- Scoring Results (Highest to Lowest) ---');
results.forEach((result, index) => {
  console.log(`#${index + 1}: "${result.dashboard.title}" (Score: ${result.score.toFixed(4)})`);
  console.log(
    `   - Breakdown: Field=${result.scoreBreakdown.fieldScore.toFixed(
      3
    )}, Text=${result.scoreBreakdown.textScore.toFixed(
      3
    )}, Recency=${result.scoreBreakdown.recencyBonus.toFixed(
      3
    )}, Penalty=${result.scoreBreakdown.defaultPenalty.toFixed(3)}`
  );
  console.log('---');
});

*/
