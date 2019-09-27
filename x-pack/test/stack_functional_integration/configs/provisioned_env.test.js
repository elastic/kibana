import provisionedEnv from './provisioned_env';
import { resolve } from 'path';

describe(`using dotenv for resolving the envvars.sh file`, () => {
  it(`should return an object with all the state, like BUILD_ID`, () => {
    const pathToFile = resolve(__dirname, '../../../../../integration-test/qa/envvars.sh');
    const envObject = provisionedEnv(pathToFile);
    expect(envObject).toHaveProperty('BUILD_ID');
  });
});
