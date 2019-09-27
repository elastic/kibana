export default async (readConfigFile, configPath) =>
  (await readConfigFile(require.resolve(configPath))).getAll();
