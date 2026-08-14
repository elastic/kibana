/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isPathValid,
  hasSimpleExecutableName,
  OperatingSystem,
  ConditionEntryField,
  TrustedDeviceConditionEntryField,
  validateWildcardInput,
  validateHasWildcardWithWrongOperator,
  validatePotentialWildcardInput,
  validateFilePathInput,
  isTrustedDeviceFieldAvailableForOs,
  WILDCARD_WARNING,
  FILEPATH_WARNING,
  CONTROL_CHARACTERS_ERROR,
  InvisibleCharacterIssue,
  LEADING_TRAILING_WHITESPACE_WARNING,
  getInvisibleCharacterIssue,
  hasControlCharacters,
  hasLeadingOrTrailingWhitespace,
} from '.';

describe('validatePotentialWildcardInput', () => {
  it('warns on wildcard when field is file.path.text', () => {
    expect(
      validatePotentialWildcardInput({
        field: 'file.path.text',
        os: OperatingSystem.WINDOWS,
        value: 'c:\\path*.exe',
      })
    ).toEqual(WILDCARD_WARNING);
  });
  it('warns on wildcard when field is not file.path.text', () => {
    expect(
      validatePotentialWildcardInput({
        field: 'event.category',
        os: OperatingSystem.WINDOWS,
        value: 'some*value',
      })
    ).toEqual(WILDCARD_WARNING);
  });
});

describe('invisible character detection', () => {
  describe('hasControlCharacters', () => {
    it.each([
      ['tab', '\tC:\\Windows\\notepad.exe'],
      ['line feed', 'C:\\Windows\\notepad.exe\n'],
      ['carriage return', 'C:\\Windows\\notepad.exe\r'],
      ['embedded NUL', 'C:\\Windows\\note\u0000pad.exe'],
      ['DEL', 'C:\\Windows\\notepad.exe\u007f'],
      ['C1 control', 'C:\\Windows\\note\u0085pad.exe'],
    ])('detects %s', (_name, value) => {
      expect(hasControlCharacters(value)).toBe(true);
    });

    it.each([
      ['a clean windows path', 'C:\\Windows\\notepad.exe'],
      ['a clean unix path', '/usr/bin/ssh'],
      ['a path with a regular space', 'C:\\Program Files\\app.exe'],
      ['an empty value', ''],
    ])('does not flag %s', (_name, value) => {
      expect(hasControlCharacters(value)).toBe(false);
    });
  });

  describe('hasLeadingOrTrailingWhitespace', () => {
    it.each([
      ['a leading space', ' C:\\Windows\\notepad.exe'],
      ['a leading tab', '\tC:\\Windows\\notepad.exe'],
      ['a trailing space', 'C:\\Windows\\notepad.exe '],
      ['a trailing newline', 'C:\\Windows\\notepad.exe\n'],
      ['a leading non-breaking space', '\u00a0C:\\Windows\\notepad.exe'],
      ['a leading byte order mark', '\ufeffC:\\Windows\\notepad.exe'],
    ])('detects %s', (_name, value) => {
      expect(hasLeadingOrTrailingWhitespace(value)).toBe(true);
    });

    it.each([
      ['a clean path', 'C:\\Windows\\notepad.exe'],
      ['an interior space', 'C:\\Program Files\\app.exe'],
      ['an empty value', ''],
    ])('does not flag %s', (_name, value) => {
      expect(hasLeadingOrTrailingWhitespace(value)).toBe(false);
    });
  });

  describe('getInvisibleCharacterIssue', () => {
    it('reports leading whitespace, the corruption seen in production trust lists', () => {
      expect(getInvisibleCharacterIssue('\tC:\\Windows\\notepad.exe')).toEqual(
        InvisibleCharacterIssue.LEADING_TRAILING_WHITESPACE
      );
      expect(getInvisibleCharacterIssue(' /usr/bin/ssh')).toEqual(
        InvisibleCharacterIssue.LEADING_TRAILING_WHITESPACE
      );
    });

    it('reports trailing whitespace', () => {
      expect(getInvisibleCharacterIssue('/usr/bin/ssh  ')).toEqual(
        InvisibleCharacterIssue.LEADING_TRAILING_WHITESPACE
      );
    });

    it('reports control characters inside the value, which trimming would not fix', () => {
      expect(getInvisibleCharacterIssue('C:\\Windows\\note\tpad.exe')).toEqual(
        InvisibleCharacterIssue.CONTROL_CHARACTERS
      );
      expect(getInvisibleCharacterIssue('/usr/bin/s\u0000sh')).toEqual(
        InvisibleCharacterIssue.CONTROL_CHARACTERS
      );
    });

    it('prefers the whitespace issue when trimming would fully fix the value', () => {
      // A leading TAB is both whitespace and a control character; it is auto-fixable, so it must not
      // be reported as the unfixable control-character issue.
      expect(getInvisibleCharacterIssue('\tC:\\Windows\\notepad.exe')).toEqual(
        InvisibleCharacterIssue.LEADING_TRAILING_WHITESPACE
      );
    });

    it.each([
      ['a clean windows path', 'C:\\Windows\\notepad.exe'],
      ['a clean unix path', '/usr/bin/ssh'],
      ['a path with interior spaces', 'C:\\Program Files\\app.exe'],
      ['a hash', 'e50fb1a0e5fff590ece385082edc6c41'],
      ['an empty value', ''],
    ])('returns undefined for %s', (_name, value) => {
      expect(getInvisibleCharacterIssue(value)).toBeUndefined();
    });

    it('returns undefined for non-string values', () => {
      expect(getInvisibleCharacterIssue(undefined)).toBeUndefined();
    });

    it('checks every value of a match_any style array', () => {
      expect(getInvisibleCharacterIssue(['/usr/bin/ssh', '/usr/bin/curl'])).toBeUndefined();
      expect(getInvisibleCharacterIssue(['/usr/bin/ssh', ' /usr/bin/curl'])).toEqual(
        InvisibleCharacterIssue.LEADING_TRAILING_WHITESPACE
      );
      expect(getInvisibleCharacterIssue(['/usr/bin/s\tsh'])).toEqual(
        InvisibleCharacterIssue.CONTROL_CHARACTERS
      );
    });
  });

  describe('validatePotentialWildcardInput', () => {
    it('reports leading whitespace instead of silently trimming it away', () => {
      expect(
        validatePotentialWildcardInput({
          field: 'file.path.text',
          os: OperatingSystem.WINDOWS,
          value: '\tC:\\Windows\\notepad.exe',
        })
      ).toEqual(LEADING_TRAILING_WHITESPACE_WARNING);
    });

    it('reports control characters', () => {
      expect(
        validatePotentialWildcardInput({
          field: 'file.path.text',
          os: OperatingSystem.WINDOWS,
          value: 'C:\\Windows\\note\tpad.exe',
        })
      ).toEqual(CONTROL_CHARACTERS_ERROR);
    });

    it('reports invisible corruption for non-path fields too', () => {
      expect(
        validatePotentialWildcardInput({
          field: 'event.category',
          os: OperatingSystem.WINDOWS,
          value: 'process ',
        })
      ).toEqual(LEADING_TRAILING_WHITESPACE_WARNING);
    });

    it('still reports the wildcard warning for otherwise clean values', () => {
      expect(
        validatePotentialWildcardInput({
          field: 'file.path.text',
          os: OperatingSystem.WINDOWS,
          value: 'c:\\path*.exe',
        })
      ).toEqual(WILDCARD_WARNING);
    });
  });
});

describe('validateWildcardInput', () => {
  it('warns on wildcard for fields that are not file paths', () => {
    expect(validateWildcardInput('*')).toEqual(WILDCARD_WARNING);
  });
  it('does not warn if no wildcard', () => {
    expect(validateWildcardInput('non-wildcard')).toEqual(undefined);
  });
});

describe('validateFilePathInput', () => {
  describe('windows', () => {
    const os = OperatingSystem.WINDOWS;

    it('does not warn on valid filenames', () => {
      expect(
        validateFilePathInput({
          os,
          value: 'C:\\Windows\\*\\FILENAME.EXE-1231205124.gz',
        })
      ).not.toBeDefined();
      expect(
        validateFilePathInput({
          os,
          value: "C:\\Windows\\*\\test$  as2@13---12!@#A,DS.#$^&$!#~ 'as'd.华语.txt",
        })
      ).toEqual(undefined);
    });

    it('warns on wildcard in file name at the end of the path', () => {
      expect(validateFilePathInput({ os, value: 'c:\\path*.exe' })).toEqual(WILDCARD_WARNING);
      expect(
        validateFilePathInput({
          os,
          value: 'C:\\Windows\\*\\FILENAME.EXE-*.gz',
        })
      ).toEqual(WILDCARD_WARNING);
    });

    it('warns on unix paths or non-windows paths', () => {
      expect(validateFilePathInput({ os, value: '/opt/bin' })).toEqual(FILEPATH_WARNING);
    });

    it('warns on malformed paths', () => {
      expect(validateFilePathInput({ os, value: 'c:\\path/opt' })).toEqual(FILEPATH_WARNING);
      expect(validateFilePathInput({ os, value: '1242' })).toEqual(FILEPATH_WARNING);
      expect(validateFilePathInput({ os, value: 'w12efdfa' })).toEqual(FILEPATH_WARNING);
      expect(validateFilePathInput({ os, value: 'c:\\folder\\' })).toEqual(FILEPATH_WARNING);
    });
  });
  describe('unix paths', () => {
    const os =
      parseInt((Math.random() * 2).toString(), 10) === 1
        ? OperatingSystem.MAC
        : OperatingSystem.LINUX;

    it('does not warn on valid filenames', () => {
      expect(
        validateFilePathInput({
          os,
          value: '/opt/*/FILENAME.EXE-1231205124.gz',
        })
      ).not.toEqual(WILDCARD_WARNING);
      expect(
        validateFilePathInput({
          os,
          value: "/opt/*/test$  as2@13---12!@#A,DS.#$^&$!#~ 'as'd.华语.txt",
        })
      ).not.toEqual(WILDCARD_WARNING);
    });
    it('warns on wildcard in file name at the end of the path', () => {
      expect(validateFilePathInput({ os, value: '/opt/bin*' })).toEqual(WILDCARD_WARNING);
      expect(validateFilePathInput({ os, value: '/opt/FILENAME.EXE-*.gz' })).toEqual(
        WILDCARD_WARNING
      );
    });

    it('warns on windows paths', () => {
      expect(validateFilePathInput({ os, value: 'd:\\path\\file.exe' })).toEqual(FILEPATH_WARNING);
    });

    it('warns on malformed paths', () => {
      expect(validateFilePathInput({ os, value: 'opt/bin\\file.exe' })).toEqual(FILEPATH_WARNING);
      expect(validateFilePathInput({ os, value: '1242' })).toEqual(FILEPATH_WARNING);
      expect(validateFilePathInput({ os, value: 'w12efdfa' })).toEqual(FILEPATH_WARNING);
      expect(validateFilePathInput({ os, value: '/folder/' })).toEqual(FILEPATH_WARNING);
    });
  });
});

describe('Wildcard and invalid operator', () => {
  it('should return TRUE when operator is not "WILDCARD" and value contains a wildcard', () => {
    expect(validateHasWildcardWithWrongOperator({ operator: 'match', value: 'asdf*' })).toEqual(
      true
    );
  });
  it('should return FALSE when operator is not "WILDCARD" and value does not contain a wildcard', () => {
    expect(validateHasWildcardWithWrongOperator({ operator: 'match', value: 'asdf' })).toEqual(
      false
    );
  });
  it('should return FALSE when operator is "WILDCARD" and value contains a wildcard', () => {
    expect(validateHasWildcardWithWrongOperator({ operator: 'wildcard', value: 'asdf*' })).toEqual(
      false
    );
  });
  it('should return FALSE when operator is "WILDCARD" and value does not contain a wildcard', () => {
    expect(validateHasWildcardWithWrongOperator({ operator: 'wildcard', value: 'asdf' })).toEqual(
      false
    );
  });
});

describe('No Warnings', () => {
  it('should not show warnings on non path entries ', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.HASH,
        type: 'match',
        value: '5d5b09f6dcb2d53a5fffc60c4ac0d55fabdf556069d6631545f42aa6e3500f2e',
      })
    ).toEqual(true);

    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.SIGNER,
        type: 'match',
        value: '',
      })
    ).toEqual(true);
  });
});

describe('Unacceptable Windows wildcard paths', () => {
  it('should not accept paths that do not have a folder name with a wildcard ', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'c:\\folder',
      })
    ).toEqual(false);
  });

  it('should not accept paths that do not have a file name with a wildcard ', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'c:\\path.exe',
      })
    ).toEqual(false);
  });

  it('should not accept nested paths that do not have a wildcard', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'c:\\folder\\path.exe',
      })
    ).toEqual(false);
  });

  it('should not accept paths with * wildcard and /', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'c:/**/path.exe',
      })
    ).toEqual(false);
  });

  it('should not accept paths with ? wildcard and /', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'C:/?indows/pat?',
      })
    ).toEqual(false);
  });
});

describe('Acceptable Windows wildcard paths', () => {
  it('should accept wildcards for folders', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'c:\\**\\path.exe',
      })
    ).toEqual(true);
  });

  it('should accept wildcards for folders and files', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'e:\\**\\*.exe',
      })
    ).toEqual(true);
  });

  it('should accept paths with single wildcard', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'f:\\*',
      })
    ).toEqual(true);

    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'f:\\?',
      })
    ).toEqual(true);
  });

  it('should accept paths that have wildcard in filenames', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'a:\\*.*',
      })
    ).toEqual(true);
  });

  it('should accept paths with ? as wildcard', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'C:\\?indows\\pat?',
      })
    ).toEqual(true);
  });

  it('should accept paths with both ? and * as wildcards', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'C:\\*?',
      })
    ).toEqual(true);
  });

  it('should accept paths with multiple wildcards', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'C:\\**',
      })
    ).toEqual(true);

    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'C:\\??',
      })
    ).toEqual(true);
  });
});

describe('Acceptable Windows exact paths', () => {
  it('should accept paths when it ends with a folder name', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: 'c:\\folder',
      })
    ).toEqual(true);
  });

  it('should accept paths when it ends with a file name', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: 'c:\\path.exe',
      })
    ).toEqual(true);
  });

  it('should accept paths when it ends with a filename in a folder', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: 'c:\\folder\\path.exe',
      })
    ).toEqual(true);
  });
});

describe('Acceptable Windows exact paths with hyphens', () => {
  it('should accept paths when paths have folder names with hyphens', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: 'c:\\hype-folder-name',
      })
    ).toEqual(true);
  });

  it('should accept paths when file names have hyphens', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: 'c:\\file-name.exe',
      })
    ).toEqual(true);
  });
});

describe('Unacceptable Windows exact paths', () => {
  it('should not accept paths with /', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: 'c:/folder/path.exe',
      })
    ).toEqual(false);
  });

  it('should not accept paths not having a <char:> in the suffix', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: '\\folder\\path.exe',
      })
    ).toEqual(false);
  });
});

///
describe('Unacceptable Mac/Linux wildcard paths', () => {
  it('should not accept paths that do not have a folder name with a wildcard ', () => {
    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: '/folder',
      })
    ).toEqual(false);
  });

  it('should not accept paths that do not have a file name with a wildcard ', () => {
    expect(
      isPathValid({
        os: OperatingSystem.LINUX,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: '/zip.zip',
      })
    ).toEqual(false);
  });

  it('should not accept nested paths that do not have a wildcard', () => {
    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: '/opt/pack.tar',
      })
    ).toEqual(false);
  });

  it('should not accept paths with * wildcard and \\', () => {
    expect(
      isPathValid({
        os: OperatingSystem.LINUX,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'c:\\**\\path.exe',
      })
    ).toEqual(false);
  });

  it('should not accept paths with ? wildcard and \\', () => {
    expect(
      isPathValid({
        os: OperatingSystem.LINUX,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'C:\\?indows\\pat?',
      })
    ).toEqual(false);
  });
});

describe('Acceptable Mac/Linux wildcard paths', () => {
  it('should accept wildcards for folders', () => {
    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: '/**/file.',
      })
    ).toEqual(true);
  });

  it('should accept wildcards for folders and files', () => {
    expect(
      isPathValid({
        os: OperatingSystem.LINUX,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: '/usr/bi?/*.js',
      })
    ).toEqual(true);
  });

  it('should accept paths with single wildcard', () => {
    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: '/op*',
      })
    ).toEqual(true);

    expect(
      isPathValid({
        os: OperatingSystem.LINUX,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: '/op?',
      })
    ).toEqual(true);
  });

  it('should accept paths that have wildcard in filenames', () => {
    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: '/*.*',
      })
    ).toEqual(true);
  });

  it('should accept paths with ? as wildcard', () => {
    expect(
      isPathValid({
        os: OperatingSystem.LINUX,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: '/usr/?inux/pat?',
      })
    ).toEqual(true);
  });

  it('should accept paths with both ? and * as wildcards', () => {
    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: '/usr/*?',
      })
    ).toEqual(true);
  });

  it('should accept paths with multiple wildcards', () => {
    expect(
      isPathValid({
        os: OperatingSystem.LINUX,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: '/usr/**',
      })
    ).toEqual(true);

    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: '/opt/??',
      })
    ).toEqual(true);
  });
});

describe('Acceptable Mac/Linux exact paths', () => {
  it('should accept paths when it is the root path', () => {
    expect(
      isPathValid({
        os: OperatingSystem.LINUX,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: '/',
      })
    ).toEqual(true);
  });

  it('should accept paths when it ends with a file name', () => {
    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: '/usr/file.ts',
      })
    ).toEqual(true);
  });

  it('should accept paths when it ends with a filename in a folder', () => {
    expect(
      isPathValid({
        os: OperatingSystem.LINUX,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: '/opt/z.dmg',
      })
    ).toEqual(true);
  });
});

describe('Acceptable Mac/Linux exact paths with hyphens', () => {
  it('should accept paths when paths have folder names with hyphens', () => {
    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: '/hype-folder-name',
      })
    ).toEqual(true);
  });

  it('should accept paths when file names have hyphens', () => {
    expect(
      isPathValid({
        os: OperatingSystem.LINUX,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: '/file-name.dmg',
      })
    ).toEqual(true);
  });
});

describe('Unacceptable Mac/Linux exact paths', () => {
  it('should not accept paths with \\', () => {
    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: 'c:\\folder\\path.exe',
      })
    ).toEqual(false);
  });

  it('should not accept paths not starting with /', () => {
    expect(
      isPathValid({
        os: OperatingSystem.LINUX,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: 'opt/bin',
      })
    ).toEqual(false);
  });

  it('should not accept paths ending with /', () => {
    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: '/opt/bin/',
      })
    ).toEqual(false);
  });

  it('should not accept file extensions with hyphens', () => {
    expect(
      isPathValid({
        os: OperatingSystem.LINUX,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: '/opt/bin/file.d-mg',
      })
    ).toEqual(false);
  });
});

describe('hasSimpleExecutableName', () => {
  it('should return TRUE when MAC/LINUX wildcard paths have an executable name', () => {
    const os =
      parseInt((Math.random() * 2).toString(), 10) === 1
        ? OperatingSystem.MAC
        : OperatingSystem.LINUX;

    expect(
      hasSimpleExecutableName({
        os,
        type: 'wildcard',
        value: '/opt/*/app',
      })
    ).toEqual(true);
    expect(
      hasSimpleExecutableName({
        os,
        type: 'wildcard',
        value: '/op*/**/app.dmg',
      })
    ).toEqual(true);
    expect(
      hasSimpleExecutableName({
        os,
        type: 'wildcard',
        value: "/sy*/test$  as2@13---12!@#A,DS.#$^&$!#~ 'as'd.华语.txt",
      })
    ).toEqual(true);
  });

  it('should return FALSE when MAC/LINUX wildcard paths have a wildcard in executable name', () => {
    const os =
      parseInt((Math.random() * 2).toString(), 10) === 1
        ? OperatingSystem.MAC
        : OperatingSystem.LINUX;

    expect(
      hasSimpleExecutableName({
        os,
        type: 'wildcard',
        value: '/op/*/*pp',
      })
    ).toEqual(false);
    expect(
      hasSimpleExecutableName({
        os,
        type: 'wildcard',
        value: '/op*/b**/ap.m**',
      })
    ).toEqual(false);
  });

  it('should return TRUE when WINDOWS wildcards paths have a executable name', () => {
    expect(
      hasSimpleExecutableName({
        os: OperatingSystem.WINDOWS,
        type: 'wildcard',
        value: 'c:\\**\\path.exe',
      })
    ).toEqual(true);
    expect(
      hasSimpleExecutableName({
        os: OperatingSystem.WINDOWS,
        type: 'wildcard',
        value: 'C:\\*\\file-name.path华语 1234.txt',
      })
    ).toEqual(true);
    expect(
      hasSimpleExecutableName({
        os: OperatingSystem.WINDOWS,
        type: 'wildcard',
        value: "C:\\*\\test$  as2@13---12!@#A,DS.#$^&$!#~ 'as'd.华语.txt",
      })
    ).toEqual(true);
  });

  it('should return FALSE when WINDOWS wildcards paths have a wildcard in executable name', () => {
    expect(
      hasSimpleExecutableName({
        os: OperatingSystem.WINDOWS,
        type: 'wildcard',
        value: 'c:\\**\\pa*h.exe',
      })
    ).toEqual(false);
  });
});

describe('isTrustedDeviceFieldAvailableForOs', () => {
  describe('USERNAME field availability', () => {
    it('should return true for USERNAME field when Windows OS is selected exclusively', () => {
      expect(
        isTrustedDeviceFieldAvailableForOs(TrustedDeviceConditionEntryField.USERNAME, [
          OperatingSystem.WINDOWS,
        ])
      ).toBe(true);
    });

    it('should return false for USERNAME field when Mac OS is selected exclusively', () => {
      expect(
        isTrustedDeviceFieldAvailableForOs(TrustedDeviceConditionEntryField.USERNAME, [
          OperatingSystem.MAC,
        ])
      ).toBe(false);
    });

    it('should return false for USERNAME field when both Windows and Mac OS are selected', () => {
      expect(
        isTrustedDeviceFieldAvailableForOs(TrustedDeviceConditionEntryField.USERNAME, [
          OperatingSystem.WINDOWS,
          OperatingSystem.MAC,
        ])
      ).toBe(false);
    });

    it('should return false for USERNAME field when Mac and Windows OS are selected (different order)', () => {
      expect(
        isTrustedDeviceFieldAvailableForOs(TrustedDeviceConditionEntryField.USERNAME, [
          OperatingSystem.MAC,
          OperatingSystem.WINDOWS,
        ])
      ).toBe(false);
    });

    it('should return false for USERNAME field when empty OS array is provided', () => {
      expect(
        isTrustedDeviceFieldAvailableForOs(TrustedDeviceConditionEntryField.USERNAME, [])
      ).toBe(false);
    });
  });

  describe('Other fields availability', () => {
    const commonFields = [
      TrustedDeviceConditionEntryField.HOST,
      TrustedDeviceConditionEntryField.DEVICE_ID,
      TrustedDeviceConditionEntryField.MANUFACTURER,
      TrustedDeviceConditionEntryField.PRODUCT_ID,
      TrustedDeviceConditionEntryField.PRODUCT_NAME,
    ];

    it.each(commonFields)(
      'should return true for %s field when Windows OS is selected exclusively',
      (field) => {
        expect(isTrustedDeviceFieldAvailableForOs(field, [OperatingSystem.WINDOWS])).toBe(true);
      }
    );

    it.each(commonFields)(
      'should return true for %s field when Mac OS is selected exclusively',
      (field) => {
        expect(isTrustedDeviceFieldAvailableForOs(field, [OperatingSystem.MAC])).toBe(true);
      }
    );

    it.each(commonFields)(
      'should return true for %s field when both Windows and Mac OS are selected',
      (field) => {
        expect(
          isTrustedDeviceFieldAvailableForOs(field, [OperatingSystem.WINDOWS, OperatingSystem.MAC])
        ).toBe(true);
      }
    );

    it.each(commonFields)(
      'should return true for %s field when empty OS array is provided',
      (field) => {
        expect(isTrustedDeviceFieldAvailableForOs(field, [])).toBe(true);
      }
    );
  });
});
