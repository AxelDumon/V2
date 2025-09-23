import { DesignDoc } from './types';

export class CouchDB {
	public static dbUrl: string = `http://127.0.0.1:5984/${process.env.DB_NAME}`;
	public static authHeader: string =
		'Basic ' +
		Buffer.from(
			`${process.env.COUCHDB_USERNAME}:${process.env.COUCHDB_PASSWORD}`
		).toString('base64');

	static async createDatabase(): Promise<void> {
		const response = await fetch(CouchDB.dbUrl, {
			method: 'PUT',
			headers: { Authorization: CouchDB.authHeader },
		});

		if (!response.ok && response.status !== 412) {
			throw new Error(`Failed to create database: ${response.statusText}`);
		}
	}

	// Upload a design document
	static async uploadDesignDoc(designDoc: DesignDoc): Promise<void> {
		const url = `${CouchDB.dbUrl}/${designDoc._id}`;
		try {
			// Check if the design document already exists
			const existingDoc = await fetch(url, {
				method: 'GET',
				headers: { Authorization: CouchDB.authHeader },
			});

			if (existingDoc.ok) {
				const existingData = await existingDoc.json();
				designDoc._rev = existingData._rev; // Add the revision ID to update the document
			}

			// Upload the design document
			const response = await fetch(url, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: CouchDB.authHeader,
				},
				body: JSON.stringify(designDoc),
			});

			if (!response.ok) {
				throw new Error(
					`Failed to upload design document: ${response.statusText}`
				);
			}

			console.log(`Design document uploaded: ${designDoc._id}`);
		} catch (error) {
			console.error('Error uploading design document:', error);
		}
	}

	static async queryView(
		viewName: string,
		params: Record<string, string> = {}
	): Promise<any[]> {
		const query = new URLSearchParams(params).toString();
		const url = `${CouchDB.dbUrl}/_design/example/_view/${viewName}?${query}`;

		try {
			const response = await fetch(url, {
				method: 'GET',
				headers: { Authorization: CouchDB.authHeader },
			});

			if (!response.ok) {
				throw new Error(`Failed to query view: ${response.statusText}`);
			}

			const data = await response.json();
			return data.rows;
		} catch (error) {
			console.error('Error querying view:', error);
			return [];
		}
	}
}
