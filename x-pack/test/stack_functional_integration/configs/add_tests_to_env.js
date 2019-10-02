import { appendFileSync, readFileSync, writeFileSync } from 'fs';
import * as dotEnv from 'dotenv';
import testsList from './tests_list';

// envObj :: path -> {}
const envObj = path => dotEnv.config({ path });

// default fn :: path -> {}
export default path => {
  const obj = envObj(path);
  return { ...obj, tests: testsList(obj) };
}
