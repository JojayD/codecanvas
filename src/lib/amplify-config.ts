

import { Amplify, GraphQLAuthMode } from 'aws-amplify';
import config from './aws-exports';

// Configure Amplify with your AppSync GraphQL API settings
Amplify.configure({
  ...config,
  API: {
    ...config.API,
    GraphQL: {
      ...config.API?.GraphQL,
      defaultAuthMode: config.API?.GraphQL?.defaultAuthMode as GraphQLAuthMode,
    }
  }
});

export default config;

