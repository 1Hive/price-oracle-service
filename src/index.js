const ethers = require('ethers')
const fetch = require('node-fetch')
const logger = require('./logger')

const ONE_GWEI = 1000000000
const ONE_HOUR = 60 * 60 * 1000

// Configuration
const {
  MNEMONIC,
  ETH_URI,
  CONTRACT_ADDRESS,
  SUBGRAPH_URI,
  INTERVAL = ONE_HOUR
} = process.env

if (!MNEMONIC) {
  logger.error('Please set `MNEMONIC`.')
  process.exit(1)
}

if (!ETH_URI) {
  logger.error('Please set `ETH_URI`.')
  process.exit(1)
}

if (!CONTRACT_ADDRESS) {
  logger.error('Please set `CONTRACT_ADDRESS`.')
  process.exit(1)
}

if (!INTERVAL) {
  logger.error('Please set `INTERVAL`.')
  process.exit(1)
}

if (!SUBGRAPH_URI) {
  logger.error('Please set `SUBGRAPH_URI`.')
  process.exit(1)
}

// Set up provider and wallet
const provider = ethers.getDefaultProvider(ETH_URI)
const wallet = ethers.Wallet
  .fromMnemonic(MNEMONIC)
  .connect(provider)

// Run information
logger.info(`Acting as ${wallet.address}`)
logger.info(`Connected to ${ETH_URI}`)
logger.info(`Calling oracle on ${CONTRACT_ADDRESS} every ${INTERVAL}ms`)

async function fetchPairs () {
  let pairs = []

  const perPage = 20
  let page = 0
  while (true) {
    const response = await fetch(SUBGRAPH_URI, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: `{
          pairs(
            first: ${perPage},
            skip: ${perPage * page}
          ) {
            token0 {
              id
            }
            token1 {
              id
            }
          } 
        }`
      })
    })
    const { data } = await response.json()

    if (data.pairs.length === 0) {
      break
    }

    pairs = pairs.concat(data.pairs)
    page++
  }

  return pairs
    .map(({ pair }) => {
      return [pair.token0.id, pair.token1.id]
    })
}

async function callOracle (
  signer,
  oracleAddress,
) {
  const pairs = await fetchPairs(oracleAddress)
  const oracle = new ethers.Contract(
    oracleAddress,
    [
      'function canUpdate (address _tokenA, address _tokenB) view returns (bool)',
      'function update (address _tokenA, address _tokenB)'
    ],
    signer
  )

  logger.info('Calling oracle...')
  for (const [tokenA, tokenB] of pairs) {
    try {
      const canUpdate = await oracle.canUpdate(tokenA, tokenB, { gasPrice: ONE_GWEI, gasLimit: 1400000 })
      if (!canUpdate) {
        logger.info(`- No need to update ${tokenA}-${tokenB} pair.`)
        continue
      }

      const tx = await oracle.update(tokenA, tokenB, { gasPrice: ONE_GWEI, gasLimit: 1400000 })
      logger.info(`- Sent transaction to update ${tokenA}-${tokenB} pair (${tx.hash})`)
      await tx.wait(2)
    } catch (err) {
      logger.fatal(`- Transaction for ${tokenA}-${tokenB} pair failed to process.`)
      logger.fatal(`- ${err.message}`)
    }
  }
  logger.info('Done calling oracle.')

  const balance = await signer.provider.getBalance(signer.address)
  logger.info(`Current balance is ${balance}`)
}

async function main () {
  await callOracle(wallet, CONTRACT_ADDRESS)

  setTimeout(() => {
    main()
  }, INTERVAL)
}

main()
