/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

const TARGET_TAGS = [
  '@ess',
  '@skipInEss',
  '@serverless',
  '@skipInServerless',
  '@brokenInServerless',
] as const;

export type TargetTags = typeof TARGET_TAGS[number];

export function targetTags(thisSuite: Mocha.Suite, tags: TargetTags[]) {
  // @ts-ignore: _tags is not publicly visible
  const existingTags = (thisSuite._tags as string[]) ?? [];
  const existingTargetTags = existingTags.filter((tag) => TARGET_TAGS.includes(tag as TargetTags));

  if (existingTargetTags.length > 0) {
    return expect().fail(`
    
    ⚠️  ERROR in \`${targetTags.name}()\`: the passed suite already has target tags.

       Suite name:         ${thisSuite.title}
       Existing tags:      ${existingTargetTags.join(', ')}
       New tags:           ${tags.join(', ')}

    💡 This can happen if you call \`${targetTags.name}()\` twice in the same block, or
        → from the inside of an arrow function
        → which is passed to a \`describe()\` block
        → which is somewhere inside \`${thisSuite.title}\`.

    ☝️  Correct usage:
          describe('must receive a regular function', function () {
            ${targetTags.name}(this, ['@serverless']);
          })
    
    `);
  }

  thisSuite.tags(tags);
}
