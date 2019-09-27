import dotEnv from 'dotenv';

export default pathToFile =>
  dotEnv.config({ path: pathToFile });

