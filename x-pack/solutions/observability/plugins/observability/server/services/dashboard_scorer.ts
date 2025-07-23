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

export interface FieldContribution {
  field: string;
  weight: number; // How much this field contributed to the score (0-1)
  isIndexPattern?: boolean; // Whether this contribution is from an index pattern match
}

export interface TextContribution {
  token: string;
  weight: number; // How much this token contributed to the score (0-1)
}

export interface PanelScore {
  panel: RankablePanel;
  fieldScore: number;
  textScore: number;
  // The relative contribution of this panel to the overall dashboard score (0-1)
  contributionToOverall: number;
  // Detailed breakdown of which fields contributed to the score
  fieldContributions: FieldContribution[];
  // Detailed breakdown of which text tokens contributed to the score
  textContributions: TextContribution[];
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
    // Dashboard-level field contributions
    fieldContributions: FieldContribution[];
    // Dashboard-level text contributions
    textContributions: TextContribution[];
    // Panel-level scores to show each panel's contribution
    panelScores: PanelScore[];
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
  private readonly DEFAULT_DASHBOARD_PENALTY = 0.1; // Multiplicative penalty for default dashboards
  private readonly RECENCY_DECAY_RATE = 0.001; // Controls how quickly the recency bonus diminishes

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
   * Calculates a score for an individual panel based on field matching
   * @returns Object containing the score and field contributions
   */
  private calculatePanelFieldScore(panel: RankablePanel): {
    score: number;
    fieldContributions: FieldContribution[];
  } {
    // Separate alert fields from index pattern
    const alertFields = new Set<string>(this.alert.queriedFields);
    const alertIndexPattern = this.alert.indexPattern;

    if (panel.queriedFields.length === 0) {
      return { score: 0, fieldContributions: [] };
    }

    // Count matching fields between alert and panel
    const panelFields = new Set(panel.queriedFields);
    const allUniqueFields = new Set([...alertFields, ...panelFields]);

    if (allUniqueFields.size === 0) {
      return { score: 0, fieldContributions: [] };
    }

    // Create vectors
    let dotProduct = 0;
    let magA = 0;
    let magB = 0;

    // Track contributions from each field
    const fieldScores: { field: string; score: number; isIndexPattern: boolean }[] = [];

    // Process regular fields
    for (const field of allUniqueFields) {
      // Skip the index pattern field (which might be in alertFields if we previously included it)
      if (field === alertIndexPattern) {
        continue;
      }

      const alertVectorVal = alertFields.has(field) ? 1 : 0;
      const panelVectorVal = panelFields.has(field) ? 1 : 0;

      // Only track fields that appear in both
      const fieldContribution = alertVectorVal * panelVectorVal;
      if (fieldContribution > 0) {
        fieldScores.push({ field, score: fieldContribution, isIndexPattern: false });
      }

      dotProduct += fieldContribution;
      magA += alertVectorVal * alertVectorVal;
      magB += panelVectorVal * panelVectorVal;
    }

    // For panels, we don't directly add index pattern contributions
    // as panels are typically focused on specific fields
    // However, we could add a "bonus" weight for panels whose fields
    // are from the same index pattern as the alert

    magA = Math.sqrt(magA);
    magB = Math.sqrt(magB);

    if (magA === 0 || magB === 0) {
      return { score: 0, fieldContributions: [] };
    }

    const finalScore = dotProduct / (magA * magB);

    // Calculate relative weight of each field contribution
    const fieldContributions: FieldContribution[] = fieldScores.map(
      ({ field, score, isIndexPattern }) => ({
        field,
        weight: dotProduct > 0 ? score / dotProduct : 0,
        isIndexPattern,
      })
    );

    // Sort by weight descending
    fieldContributions.sort((a, b) => b.weight - a.weight);

    return { score: finalScore, fieldContributions };
  }

  /**
   * Calculates a text similarity score for an individual panel
   * @returns Object containing the score and text token contributions
   */
  private calculatePanelTextSimilarity(panel: RankablePanel): {
    score: number;
    textContributions: TextContribution[];
  } {
    const panelTokens = this.tokenizeAndClean(panel.title);

    const intersection = new Set(
      [...this.alertTextTokens].filter((token) => panelTokens.has(token))
    );
    const union = new Set([...this.alertTextTokens, ...panelTokens]);

    if (union.size === 0) {
      return { score: 0, textContributions: [] };
    }

    const jaccardScore = intersection.size / union.size;

    // Calculate the contribution of each matching token
    const textContributions: TextContribution[] = [...intersection].map((token) => ({
      token,
      // Each token in the intersection contributes equally to the Jaccard similarity
      weight: intersection.size > 0 ? 1 / intersection.size : 0,
    }));

    // Sort by token name for consistent display
    textContributions.sort((a, b) => a.token.localeCompare(b.token));

    return { score: jaccardScore, textContributions };
  }

  /**
   * Calculates scores for all panels in a dashboard
   */
  private calculatePanelScores(dashboard: RankableDashboard): PanelScore[] {
    // First calculate raw scores for all panels
    const panelRawScores = dashboard.panels.map((panel) => {
      const fieldScoreResult = this.calculatePanelFieldScore(panel);
      const textScoreResult = this.calculatePanelTextSimilarity(panel);

      // Calculate a combined score for this panel
      const combinedPanelScore =
        this.W_FIELD * fieldScoreResult.score + this.W_TEXT * textScoreResult.score;

      if (combinedPanelScore > 0) {
        console.log('calculatePanelScores', {
          panel,
          fieldScore: fieldScoreResult.score,
          textScore: textScoreResult.score,
          combinedPanelScore,
        });
      }

      return {
        panel,
        fieldScoreResult,
        textScoreResult,
        combinedScore: combinedPanelScore,
      };
    });

    // Calculate the total combined score
    const totalCombinedScore = panelRawScores.reduce((sum, panel) => sum + panel.combinedScore, 0);

    // Calculate the contribution of each panel to the overall score
    return panelRawScores.map(({ panel, fieldScoreResult, textScoreResult, combinedScore }) => {
      // Avoid division by zero
      const contributionToOverall = totalCombinedScore > 0 ? combinedScore / totalCombinedScore : 0;

      return {
        panel,
        fieldScore: fieldScoreResult.score,
        textScore: textScoreResult.score,
        contributionToOverall,
        fieldContributions: fieldScoreResult.fieldContributions,
        textContributions: textScoreResult.textContributions,
      };
    });
  }

  /**
   * Calculates the final combined score for a single dashboard.
   * This method orchestrates the different scoring components.
   */
  private calculateCombinedScore(dashboard: RankableDashboard): ScoredDashboard {
    // 1. Calculate panel-level scores, filtering out panels with no score
    const panelScores = this.calculatePanelScores(dashboard).filter(
      (score) => score.contributionToOverall > 0
    );

    // 2. Calculate the core scores for field and text matching
    // We still keep the original dashboard-level field score for backwards compatibility
    const fieldScoreResult = this.calculateFieldScore(dashboard);
    const fieldScore = fieldScoreResult.score;

    // For text similarity, we can use a weighted average of panel text scores and dashboard title
    const textScoreResult = this.calculateTextSimilarity(dashboard);
    const dashboardTitleScore = textScoreResult.score;

    // Average text scores from panels
    const avgPanelTextScore =
      panelScores.length > 0
        ? panelScores.reduce((sum, panel) => sum + panel.textScore, 0) / panelScores.length
        : 0;

    // Combined text score with more weight on dashboard title
    const textScore = dashboardTitleScore * 0.6 + avgPanelTextScore * 0.4;

    // 3. Calculate bonuses and penalties
    const recencyBonus = this.calculateRecencyBonus(dashboard);
    const defaultPenalty = this.getDefaultDashboardPenalty(dashboard);

    // 4. Combine scores using a weighted average
    // The base score is a weighted sum of the content-based scores.
    const baseScore = this.W_FIELD * fieldScore + this.W_TEXT * textScore;

    // 5. Apply recency bonus and default penalty
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
        fieldContributions: fieldScoreResult.fieldContributions,
        textContributions: textScoreResult.textContributions,
        panelScores,
      },
    };
  }

  /**
   * Calculates a score based on shared fields, factoring in frequency.
   * This is more nuanced than a simple intersection/union.
   * We'll use cosine similarity on term frequency vectors.
   */
  private calculateFieldScore(dashboard: RankableDashboard): {
    score: number;
    fieldContributions: FieldContribution[];
  } {
    // Separate alert fields from index pattern
    const alertFields = new Set<string>(this.alert.queriedFields);
    const alertIndexPattern = this.alert.indexPattern;

    // Create a frequency map for dashboard fields (excluding index patterns)
    const dashboardFieldFreq = new Map<string, number>();
    const dashboardFields = dashboard.panels.flatMap((p) => p.queriedFields);

    // Create a frequency map for dashboard index patterns
    const dashboardIndexPatternFreq = new Map<string, number>();

    // Process fields
    for (const field of dashboardFields) {
      dashboardFieldFreq.set(field, (dashboardFieldFreq.get(field) || 0) + 1);
    }

    // Process index patterns separately
    for (const indexPattern of dashboard.indexPatterns) {
      dashboardIndexPatternFreq.set(
        indexPattern,
        (dashboardIndexPatternFreq.get(indexPattern) || 0) + 1
      );
    }

    const allUniqueFields = new Set([...alertFields, ...dashboardFieldFreq.keys()]);
    const allUniqueIndexPatterns = new Set([
      alertIndexPattern,
      ...dashboardIndexPatternFreq.keys(),
    ]);

    if (allUniqueFields.size === 0 && allUniqueIndexPatterns.size === 0) {
      return { score: 0, fieldContributions: [] };
    }

    // Create vectors
    let dotProduct = 0;
    let magA = 0;
    let magB = 0;

    // Track contributions from each field
    const fieldScores: { field: string; score: number; isIndexPattern: boolean }[] = [];

    // Process regular fields
    for (const field of allUniqueFields) {
      const alertVectorVal = alertFields.has(field) ? 1 : 0;
      const dashboardVectorVal = dashboardFieldFreq.get(field) || 0;

      // Calculate this field's contribution to the dot product
      const fieldContribution = alertVectorVal * dashboardVectorVal;

      // Only track fields that appear in both alert and dashboard
      if (fieldContribution > 0) {
        fieldScores.push({ field, score: fieldContribution, isIndexPattern: false });
      }

      dotProduct += fieldContribution;
      magA += alertVectorVal * alertVectorVal;
      magB += dashboardVectorVal * dashboardVectorVal;
    }

    // Process index patterns separately
    for (const indexPattern of allUniqueIndexPatterns) {
      // For the alert, we only have one index pattern
      const alertVectorVal = indexPattern === alertIndexPattern ? 1 : 0;
      const dashboardVectorVal = dashboardIndexPatternFreq.get(indexPattern) || 0;

      // Calculate this index pattern's contribution to the dot product
      // Apply a 4x discount (0.25 multiplier) to index pattern contributions
      const fieldContribution = alertVectorVal * dashboardVectorVal * 0.25;

      // Only track index patterns that appear in both alert and dashboard
      if (fieldContribution > 0) {
        fieldScores.push({
          field: `[index] ${indexPattern}`,
          score: fieldContribution,
          isIndexPattern: true,
        });
      }

      dotProduct += fieldContribution;
      magA += alertVectorVal * alertVectorVal;
      magB += dashboardVectorVal * dashboardVectorVal;
    }

    magA = Math.sqrt(magA);
    magB = Math.sqrt(magB);

    if (magA === 0 || magB === 0) {
      return { score: 0, fieldContributions: [] };
    }

    const finalScore = dotProduct / (magA * magB);

    // Calculate relative weight of each field contribution
    const fieldContributions: FieldContribution[] = fieldScores.map(
      ({ field, score, isIndexPattern }) => ({
        field,
        weight: dotProduct > 0 ? score / dotProduct : 0,
        isIndexPattern,
      })
    );

    // Sort by weight descending
    fieldContributions.sort((a, b) => b.weight - a.weight);

    return { score: finalScore, fieldContributions };
  }

  /**
   * Calculates a score based on textual similarity of names and descriptions.
   * Uses Jaccard similarity on tokenized text, which is simpler than TF-IDF.
   */
  private calculateTextSimilarity(dashboard: RankableDashboard): {
    score: number;
    textContributions: TextContribution[];
  } {
    const dashboardText = dashboard.title + ' ' + dashboard.panels.map((p) => p.title).join(' ');
    const dashboardTokens = this.tokenizeAndClean(dashboardText);

    const intersection = new Set(
      [...this.alertTextTokens].filter((token) => dashboardTokens.has(token))
    );
    const union = new Set([...this.alertTextTokens, ...dashboardTokens]);

    if (union.size === 0) {
      return { score: 0, textContributions: [] };
    }

    const jaccardScore = intersection.size / union.size;

    // Calculate the contribution of each matching token
    const textContributions: TextContribution[] = [...intersection].map((token) => ({
      token,
      // Each token in the intersection contributes equally to the Jaccard similarity
      weight: intersection.size > 0 ? 1 / intersection.size : 0,
    }));

    // Sort by token name for consistent display
    textContributions.sort((a, b) => a.token.localeCompare(b.token));

    return { score: jaccardScore, textContributions };
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

  /**
   * Helper method to display detailed information about a scored dashboard
   * including field and text contributions
   */
  public displayDetailedScore(scoredDashboard: ScoredDashboard): void {
    const { dashboard, score, scoreBreakdown } = scoredDashboard;

    console.log(`Dashboard: "${dashboard.title}" (Score: ${score.toFixed(4)})`);
    console.log(
      `- Breakdown: Field=${scoreBreakdown.fieldScore.toFixed(3)}, ` +
        `Text=${scoreBreakdown.textScore.toFixed(3)}, ` +
        `Recency=${scoreBreakdown.recencyBonus.toFixed(3)}, ` +
        `Penalty=${scoreBreakdown.defaultPenalty.toFixed(3)}`
    );

    // Show dashboard level field contributions
    if (scoreBreakdown.fieldContributions.length > 0) {
      // Separate index patterns from regular fields
      const indexPatternContributions = scoreBreakdown.fieldContributions.filter(
        (fc) => fc.isIndexPattern
      );
      const fieldContributions = scoreBreakdown.fieldContributions.filter(
        (fc) => !fc.isIndexPattern
      );

      // Show index pattern contributions first
      if (indexPatternContributions.length > 0) {
        console.log('- Dashboard Index Pattern Contributions:');
        indexPatternContributions.forEach(({ field, weight }) => {
          console.log(`  - ${field}: ${(weight * 100).toFixed(1)}%`);
        });
      }

      // Show field contributions
      if (fieldContributions.length > 0) {
        console.log('- Dashboard Field Contributions:');
        fieldContributions.forEach(({ field, weight }) => {
          console.log(`  - ${field}: ${(weight * 100).toFixed(1)}%`);
        });
      }
    }

    // Show dashboard level text contributions
    if (scoreBreakdown.textContributions.length > 0) {
      console.log('- Dashboard Text Contributions:');
      scoreBreakdown.textContributions.forEach(({ token, weight }) => {
        console.log(`  - "${token}": ${(weight * 100).toFixed(1)}%`);
      });
    }

    // Show individual panel scores
    console.log('- Panel Scores:');
    scoreBreakdown.panelScores.forEach((panelScore, panelIndex) => {
      console.log(`  Panel ${panelIndex + 1}: "${panelScore.panel.title}"`);
      console.log(`  - Field Score: ${panelScore.fieldScore.toFixed(3)}`);

      // Show field contributions
      if (panelScore.fieldContributions.length > 0) {
        // Separate index patterns from regular fields
        const indexPatternContributions = panelScore.fieldContributions.filter(
          (fc) => fc.isIndexPattern
        );
        const fieldContributions = panelScore.fieldContributions.filter((fc) => !fc.isIndexPattern);

        // Show index pattern contributions first
        if (indexPatternContributions.length > 0) {
          console.log(`  - Index Pattern Contributions:`);
          indexPatternContributions.forEach(({ field, weight }) => {
            console.log(`    - ${field}: ${(weight * 100).toFixed(1)}%`);
          });
        }

        // Show field contributions
        if (fieldContributions.length > 0) {
          console.log(`  - Field Contributions:`);
          fieldContributions.forEach(({ field, weight }) => {
            console.log(`    - ${field}: ${(weight * 100).toFixed(1)}%`);
          });
        }
      }

      console.log(`  - Text Score: ${panelScore.textScore.toFixed(3)}`);

      // Show text contributions
      if (panelScore.textContributions.length > 0) {
        console.log(`  - Text Contributions:`);
        panelScore.textContributions.forEach(({ token, weight }) => {
          console.log(`    - "${token}": ${(weight * 100).toFixed(1)}%`);
        });
      }

      console.log(
        `  - Contribution: ${(panelScore.contributionToOverall * 100).toFixed(
          1
        )}% of total dashboard score`
      );
    });
  }
}
