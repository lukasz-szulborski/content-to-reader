const { pathsToModuleNameMapper } = require("ts-jest");
const { compilerOptions } = require("./tsconfig");

const esModules = ["@extractus/article-extractor", "bellajs"].join("|");

module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  modulePaths: [compilerOptions.baseUrl],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths),
  verbose: true,
  transformIgnorePatterns: [`<rootDir>/node_modules/(?!${esModules})`],
  transform: {
    "^.+\\.(ts)?$": "ts-jest",
    "^.+\\.(js)$": "babel-jest",
  },
};
