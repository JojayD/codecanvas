// import { Amplify } from 'aws-amplify';
// import config from "../../aws-exports";
//
// // Configure Amplify with your AppSync GraphQL API settings
// Amplify.configure({
//     ...config,
//     API: {
//         ...config.API,
//         GraphQL: {
//             ...config.API?.GraphQL,
//             defaultAuthMode: "apiKey" // explicitly set to uppercase literal
//         }
//     }
// });
//
// export default config;
import { Amplify } from "aws-amplify";

// Use the configuration from src/app/utils/amplify-config.js instead
// as it already correctly imports and configures Amplify
export { configureAmplify } from "../app/utils/amplify-config.js";
