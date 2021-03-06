## Price Oracle Service

A small service that calls a Uniswap oracle periodically.

## Running

Clone the repository and install the dependencies.

The service is configured using environment variables that you need to supply when you run `npm start`.

### Configuration

- `ETH_URI`: The Ethereum node to connect ot.
- `CONTRACT_ADDRESS`: The oracle contract address.
- `MNEMONIC`: The mnemonic for the private key the bot should use when sending transactions.
- `SUBGRAPH_URI`: The Honeyswap subgraph URI to fetch pair information from.
- `INTERVAL`: The interval at which the service will check if it can update the oracle, and if so, do it. Defaults to 1 hour.

Instead of updating all pairs in the subgraph, you can also run this service in "single execution mode" which will only update one pair. To do that, you need to specify the environment variables `TOKEN_A` and `TOKEN_B`, which are both addresses.