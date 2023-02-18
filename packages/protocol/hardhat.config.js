/** @type import('hardhat/config').HardhatUserConfig */

require("dotenv").config();

require("@nomiclabs/hardhat-truffle5");
require("hardhat-abi-exporter");
require("hardhat-deploy");
require("hardhat-deploy-tenderly");
require("hardhat-gas-reporter");
require("solidity-coverage");

const { node_url, accounts } = require("./utils/network");

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.5.17",
        settings: {
          optimizer: {
            enabled: true,
            runs: 10000,
          },
        },
      },
    ],
  },
  namedAccounts: {
    deployer: 0,
  },
  networks: {
    goerli: {
      url: node_url("goerli"),
      accounts: accounts("goerli"),
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
  },
  abiExporter: {
    flat: true,
  },
};
