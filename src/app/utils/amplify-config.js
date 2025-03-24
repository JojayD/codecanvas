import { Amplify } from "aws-amplify";
import amplifyConfig from "../../../amplify_outputs.json";
import awsExports from "../../../aws-exports";

export function configureAmplify() {
	// Configure Amplify using the amplify_outputs.json file (Gen 2)
	if (amplifyConfig) {
		Amplify.configure(
			{
				Auth: {
					Cognito: {
						userPoolId: amplifyConfig.auth.user_pool_id,
						userPoolClientId: amplifyConfig.auth.user_pool_client_id,
						identityPoolId: amplifyConfig.auth.identity_pool_id,
					},
				},
				// Configure other services as needed from amplifyConfig
				API: {
					GraphQL: {
						endpoint: amplifyConfig.data.url,
						region: amplifyConfig.data.aws_region,
						defaultAuthMode: "apiKey",
					},
				},
			},
			{
				ssr: true,
			}
		);
	}
	// Fallback to aws-exports.js if amplify_outputs.json is not available (Gen 1)
	else if (awsExports) {
		Amplify.configure(awsExports, {
			ssr: true,
		});
	}
}
