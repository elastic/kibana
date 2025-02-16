/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @typescript-eslint/triple-slash-reference, spaced-comment
/// <reference types="@kbn/ambient-ftr-types"/>

// @ts-expect-error
import { it as mochaIt } from 'mocha';
import {
  chatClient,
  logger,
} from '@kbn/observability-ai-assistant-app-plugin/scripts/evaluation/services';

function createIt(test: typeof mochaIt) {
  return function it(
    { name, testCount }: { name: string; testCount: number },
    fn: (this: Mocha.Context) => Promise<void>
  ) {
    test(name, async function (this: Mocha.Context) {
      this.timeout(testCount * 600000); // 10 minutes for each test run

      const allScores: number[] = [];
      let maxTestScore: number = 0;
      chatClient.onResult(async (result) => {
        const testRunScore = result.scores.reduce((acc, score) => {
          return acc + score.score;
        }, 0);
        maxTestScore = result.scores.length;
        allScores.push(testRunScore);
        logger.write('-------------------------------------------');
        logger.write(`Test run score: ${testRunScore} out of ${maxTestScore}`);
        logger.write('-------------------------------------------');
      });

      for (let i = 0; i < testCount; i++) {
        await fn.apply(this);
      }

      const averageScore = allScores.reduce((acc, score) => acc + score, 0) / allScores.length;

      logger.write('-------------------------------------------');
      logger.write(`Executed ${testCount} test runs`);
      logger.write('-------------------------------------------');
      logger.write(`Average score: ${averageScore} out of ${maxTestScore}`);
      logger.write('-------------------------------------------');
      logger.write(`Grade: ${(averageScore / maxTestScore) * 100}%`);
      logger.write('-------------------------------------------');
      logger.write(`Individual scores: ${allScores.join(', ')}`);
      logger.write('-------------------------------------------');
    });
  };
}

const it = createIt(mochaIt) as typeof mochaIt & {
  only: typeof mochaIt.only;
  skip: typeof mochaIt.skip;
};
it.only = createIt(mochaIt.skip);
it.skip = createIt(mochaIt.skip);

export { it };
