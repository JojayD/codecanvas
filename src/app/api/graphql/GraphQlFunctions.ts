// Debug info - export the schema structure we need
export const DEBUG_REQUIRED_SCHEMA = `
type Room {
	name: String!
	description: String!
	createdAt: AWSDateTime!
	code: String!
	updatedAt: AWSDateTime!
	participants: [String]!
	id: ID!
}

input CreateRoomInput {
	name: String!
	description: String!
	createdAt: AWSDateTime
	code: String!
	updatedAt: AWSDateTime
	participants: [String]!
	id: ID
}

input UpdateRoomInput {
	name: String
	description: String
	createdAt: AWSDateTime
	code: String
	updatedAt: AWSDateTime
	participants: [String]
	id: ID!
}

type Mutation {
	createRoom(input: CreateRoomInput!, condition: ModelRoomConditionInput): Room
	updateRoom(input: UpdateRoomInput!, condition: ModelRoomConditionInput): Room
	deleteRoom(input: DeleteRoomInput!, condition: ModelRoomConditionInput): Room
}
`;

console.log("DEBUG: Loading GraphQlFunctions.ts");

export const onRoomUpdated = /* GraphQL */ `
	subscription OnRoomUpdated($roomId: ID!) {
		onRoomUpdated(roomId: $roomId) {
			id
			name
			description
			code
			updatedAt
			participants
		}
	}
`;

export const onUserJoined = /* GraphQL */ `
	subscription OnUserJoined($roomId: ID!) {
		onUserJoined(roomId: $roomId) {
			userId
			username
			joinedAt
			roomId
		}
	}
`;

// GraphQL operations
export const getRoomQuery = /* GraphQL */ `
	query GetRoom($id: ID!) {
		getRoom(id: $id) {
			id
			name
			description
			code
			updatedAt
			participants
			createdAt
		}
	}
`;

console.log("DEBUG: Defining createRoomMutation");
export const createRoomMutation = /* GraphQL */ `
	mutation CreateRoom($input: CreateRoomInput!) {
		createRoom(input: $input) {
			id
			name
			description
			code
			updatedAt
			participants
			createdAt
		}
	}
`;
console.log("DEBUG: createRoomMutation defined as:", createRoomMutation);

// Alternative version with documentInput for testing
export const createRoomMutationWithDocument = /* GraphQL */ `
	mutation CreateRoom($id: ID!, $documentInput: DocumentInput!) {
		createRoom(id: $id, documentInput: $documentInput) {
			id
			updatedAt
			participants
		}
	}
`;

export const updateRoomMutation = /* GraphQL */ `
	mutation UpdateRoom($input: UpdateRoomInput!) {
		updateRoom(input: $input) {
			id
			name
			description
			code
			updatedAt
			participants
			createdAt
		}
	}
`;

export const onRoomUpdatedSubscription = /* GraphQL */ `
	subscription OnRoomUpdated($filter: ModelSubscriptionRoomFilterInput) {
		onUpdateRoom(filter: $filter) {
			id
			name
			description
			code
			updatedAt
			participants
			createdAt
		}
	}
`;

export const joinRoomMutation = /* GraphQL */ `
	mutation JoinRoom($input: UpdateRoomInput!) {
		updateRoom(input: $input) {
			id
			name
			description
			code
			updatedAt
			participants
			createdAt
		}
	}
`;
