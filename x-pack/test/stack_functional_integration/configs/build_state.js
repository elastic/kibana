import dotEnv from 'dotenv';
import testsList from './tests_list';

// envObj :: path -> {}
const envObj = path => dotEnv.config({ path });

// default fn :: path -> {}
export default path => {
  const obj = envObj(path).parsed;
  return { tests: testsList(obj), ...obj, };
}
