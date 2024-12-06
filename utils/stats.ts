import { ApolloClient, InMemoryCache } from "@apollo/client";

const SUBGRAPH_URLS = {
  neoX: "", //TODO: Add mainnet url
};

export function getSubgraphUrl(networkName) {
  const url = SUBGRAPH_URLS[networkName];

  if (!url) {
    throw new Error("Unsupported network");
  }

  return url;
}

export function getSubgraphClient(networkName) {
  const url = getSubgraphUrl(networkName);
  return new ApolloClient({
    uri: url,
    cache: new InMemoryCache(),
  });
}
