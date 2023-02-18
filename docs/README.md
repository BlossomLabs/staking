# Staking App [<img height="100" align="right" alt="aragon-logo" src="https://user-images.githubusercontent.com/33203511/217436477-b2dae151-5e47-454c-885f-9158793e6790.png">](https://github.com/BlossomLabs/aragon-dao)

[![Contracts CI/CD](https://github.com/BlossomLabs/staking/actions/workflows/ci_contracts.yml/badge.svg)](https://github.com/BlossomLabs/staking/actions/workflows/ci_contracts.yml)
[![codecov](https://codecov.io/github/BlossomLabs/staking/branch/master/graph/badge.svg?token=A0U4Q81AG4)](https://codecov.io/github/BlossomLabs/staking)

The Staking app complies with [interface ERC900](https://eips.ethereum.org/EIPS/eip-900) with the following added features:

- Anti-sybil protection
- Locking-slashing mechanism

The main motivation is to be used in conjunction with [Agreements](https://github.com/aragon/aragon-apps/tree/master/apps/agreement) in the context of Aragon Network, but it has been designed to be as generic as possible, in order to allow for other use cases too.

You can read the initial motivation and spec for this [here](https://forum.aragon.org/t/staking-locks-spec-v2/217).

## Table of Contents

1. [Anti-sybil protection](./1-anti-sybil)
2. [Locking-slashing mechanism](./2-locking-slashing)
3. [Entry points](./3-entry-points)
4. [Data structures](./4-data-structures)
5. [External interface](./5-external-interface)
6. [Deployment](./6-deployment)
7. [Testing guide](./7-testing-guide)

