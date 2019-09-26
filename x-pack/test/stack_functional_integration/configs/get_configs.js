export default async function (readConfigFile, configPath){
  const xs = await readConfigFile(require.resolve(configPath));
  return xs.getAll();
};
