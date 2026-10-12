/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  AttackStage,
  BriefSnapshot,
} from '../../../../../common/entity_analytics/executive_brief/types';

export type HeadlineReason = 'rules_not_working' | 'unaddressed_storyline' | 'alert_volume';

export interface BlindSpotHeadline {
  stage: AttackStage;
  reason: HeadlineReason;
  /** Rank of the highest-ranked unaddressed storyline that moved through this stage, if any. */
  storylineRank?: number;
  title: string;
}

const alertsOf = ({ observed }: AttackStage): number => observed.alerts;
const activityOf = ({ observed }: AttackStage): number =>
  observed.alerts + observed.attackDiscoveries + observed.mlAnomalies;

const plural = (count: number, singular: string, pluralForm: string): string =>
  count === 1 ? singular : pluralForm;

const notWorkingShare = ({ coverage }: AttackStage): number =>
  coverage.enabled === 0 ? 0 : (coverage.enabled - coverage.effective) / coverage.enabled;

const byActivityDesc = (a: AttackStage, b: AttackStage): number =>
  activityOf(b) - activityOf(a) || a.position - b.position;

/**
 * Picks the stage to call out, in priority order: stages whose detection rules are not working
 * (enabled > effective) -> stages on an unaddressed storyline's path -> highest alert volume among
 * stages flagged for limited coverage. Only stages with activity qualify.
 */
export const pickBlindSpotHeadline = (snapshot: BriefSnapshot): BlindSpotHeadline | undefined => {
  const active = snapshot.blindSpots.attackStages.stages.filter((stage) => activityOf(stage) > 0);
  const unaddressed = snapshot.storylines.storylines
    .filter(({ response }) => response.state === 'unaddressed')
    .sort((a, b) => a.rank - b.rank);
  const storylineRankFor = (stage: AttackStage): number | undefined =>
    unaddressed.find(({ tacticIds }) => tacticIds.includes(stage.tacticId))?.rank;

  const broken = active
    .filter(({ coverage }) => coverage.enabled > coverage.effective)
    .sort(
      (a, b) =>
        Number(storylineRankFor(b) !== undefined) - Number(storylineRankFor(a) !== undefined) ||
        notWorkingShare(b) - notWorkingShare(a) ||
        byActivityDesc(a, b)
    )[0];
  if (broken) {
    const { enabled, effective } = broken.coverage;
    const notWorking = enabled - effective;
    const storylineRank = storylineRankFor(broken);
    const path =
      storylineRank === undefined
        ? ''
        : storylineRank === 1
        ? ', and the top priority threat moved through this stage'
        : ', and an unaddressed threat moved through this stage';
    return {
      stage: broken,
      reason: 'rules_not_working',
      storylineRank,
      title: `${broken.tacticName}: ${notWorking} of ${enabled} detection ${plural(
        enabled,
        'rule',
        'rules'
      )} ${notWorking === 1 ? "isn't" : "aren't"} working${path}`,
    };
  }

  const onPath = active
    .filter((stage) => storylineRankFor(stage) !== undefined)
    .sort(byActivityDesc)[0];
  if (onPath) {
    const { effective } = onPath.coverage;
    return {
      stage: onPath,
      reason: 'unaddressed_storyline',
      storylineRank: storylineRankFor(onPath),
      title: `${
        onPath.tacticName
      }: an unaddressed storyline moved through this stage with only ${effective} working detection ${plural(
        effective,
        'rule',
        'rules'
      )}`,
    };
  }

  const busiest = active
    .filter(({ flag }) => flag !== 'none')
    .sort((a, b) => alertsOf(b) - alertsOf(a) || byActivityDesc(a, b))[0];
  if (busiest) {
    return {
      stage: busiest,
      reason: 'alert_volume',
      title: `${busiest.tacticName}: ${
        busiest.flag === 'no_working_detection'
          ? 'no working detection'
          : 'limited detection coverage'
      } on a stage with ${alertsOf(busiest)} ${plural(alertsOf(busiest), 'alert', 'alerts')}`,
    };
  }
  return undefined;
};
