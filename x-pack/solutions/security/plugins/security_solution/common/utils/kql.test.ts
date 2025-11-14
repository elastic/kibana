/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  escapeKQLStringParam,
  prepareKQLParam,
  prepareKQLStringParam,
  fullyEscapeKQLStringParam,
} from './kql';

const partialEscapeTestCases = [
  ['does NOT remove white spaces quotes', ' netcat', ' netcat'],
  ['escapes quotes', 'I said, "Hello."', 'I said, \\"Hello.\\"'],
  [
    'should escape special characters',
    `This \\ has (a lot of) <special> characters, don't you *think*? "Yes."`,
    `This \\\\ has (a lot of) <special> characters, don't you *think*? \\"Yes.\\"`,
  ],
  ['does NOT escape keywords', 'foo and bar or baz not qux', 'foo and bar or baz not qux'],
  [
    'does NOT escape keywords next to each other',
    'foo and bar or not baz',
    'foo and bar or not baz',
  ],
  [
    'does NOT escape keywords without surrounding spaces',
    'And this has keywords, or does it not?',
    'And this has keywords, or does it not?',
  ],
  [
    'does NOT escape uppercase keywords',
    'And this has keywords, or does it not?',
    'And this has keywords, or does it not?',
  ],
  ['does NOT escape uppercase keywords', 'foo AND bar', 'foo AND bar'],
  [
    'escapes special characters and NOT keywords',
    'Hello, "world", and <nice> to meet you!',
    'Hello, \\"world\\", and <nice> to meet you!',
  ],
  [
    'escapes newlines and tabs',
    'This\nhas\tnewlines\r\nwith\ttabs',
    'This\\nhas\\tnewlines\\r\\nwith\\ttabs',
  ],
  [
    'escapes backslashes at the end of the string',
    'Try not to break the search\\',
    'Try not to break the search\\\\',
  ],
];

describe('prepareKQLParam', () => {
  it.each(partialEscapeTestCases)('%s', (_, input, expected) => {
    expect(prepareKQLParam(input)).toBe(`"${expected}"`);
  });

  it('stringifies numbers without enclosing by quotes', () => {
    const input = 10;
    const expected = '10';

    expect(prepareKQLParam(input)).toBe(expected);
  });

  it('stringifies booleans without enclosing by quotes', () => {
    const input = true;
    const expected = 'true';

    expect(prepareKQLParam(input)).toBe(expected);
  });
});

describe('prepareKQLStringParam', () => {
  it.each(partialEscapeTestCases)('%s', (_, input, expected) => {
    expect(prepareKQLStringParam(input)).toBe(`"${expected}"`);
  });
});

describe('escapeKQLStringParam', () => {
  it.each(partialEscapeTestCases)('%s', (_, input, expected) => {
    expect(escapeKQLStringParam(input)).toBe(expected);
  });
});

const fullyEscapeTestCases = [
  ['escapes quotes, but keeps commas and dots', 'I said, "Hello."', 'I said, \\"Hello.\\"'],
  [
    'should cleanup special characters',
    `This \\ has (a lot of) <special> characters, don't you *think*? "Yes."`,
    `This \\\\ has \\(a lot of\\) \\<special\\> characters, don't you \\*think\\*? \\"Yes.\\"`,
  ],
  [
    'should cleanup special characters and trim whitespace',
    `a "user-agent+ \t }with \n a *\\:(surprise{)   \t`,
    `a \\"user-agent+ \\}with a \\*\\\\\\:\\(surprise\\{\\)`,
  ],
  [
    "should keep certain characters that are not problematic (.,'&^%$#)",
    `\t some characters are ok to use .,'&^%$#-+_=|/!`,
    `some characters are ok to use .,'&^%$#-+_=|/!`,
  ],
  ['does NOT escape keywords', 'foo and bar or baz not qux', 'foo and bar or baz not qux'],
  [
    'It can also handle creepy unicode',
    'It can also handle c̶̛̫̜̞̜͕̼̱̘̤̔̿̽́̉̓̋͠͠r̵̨̨̳̯̬͔̰̙͕̲̭̞̈́͒́͋͛̕͝ȩ̷̨͖̻͓̭̮͙͖̬̿͛͐̀̐̄̀͆̾̀̏̓͗̇͘͜ḛ̷̲̖͚̼͇̖̖̩̤͖̪̠̍͂̆͒̂̿̐p̸̹͇̲͇̬̞̞̐̃̎̍͂͐̐́̋̂͝y̶̧̝͔̙̮͖̹̯̺͇̞̰̹͉̏͗̿͑̿͆̐̈́ unicode',
    'It can also handle c̶̛̫̜̞̜͕̼̱̘̤̔̿̽́̉̓̋͠͠r̵̨̨̳̯̬͔̰̙͕̲̭̞̈́͒́͋͛̕͝ȩ̷̨͖̻͓̭̮͙͖̬̿͛͐̀̐̄̀͆̾̀̏̓͗̇͘͜ḛ̷̲̖͚̼͇̖̖̩̤͖̪̠̍͂̆͒̂̿̐p̸̹͇̲͇̬̞̞̐̃̎̍͂͐̐́̋̂͝y̶̧̝͔̙̮͖̹̯̺͇̞̰̹͉̏͗̿͑̿͆̐̈́ unicode',
  ],
];

describe('fullyEscapeKQLStringParam', () => {
  it.each(fullyEscapeTestCases)('%s', (_, input, expected) => {
    expect(fullyEscapeKQLStringParam(input)).toBe(expected);
  });
});
