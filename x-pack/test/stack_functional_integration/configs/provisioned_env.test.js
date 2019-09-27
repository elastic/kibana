import provisionedEnv from './provisioned_env';
import { resolve } from 'path';

describe(`using dotenv for resolving the envvars.sh file`, () => {
  let pathToFile;
  let envObject;
  beforeAll(() => {
    pathToFile = resolve(__dirname, '../../../../../integration-test/qa/envvars.sh');
    envObject = provisionedEnv(pathToFile);
  });
  describe(`should return an object with all the state`, () => {
    it(`including BUILD_ID`, () => {
      expect(envObject).toHaveProperty('BUILD_ID');
    });
    it(`including SECURITY`, () => {
      expect(envObject).toHaveProperty('SECURITY');
    });
  });
});
